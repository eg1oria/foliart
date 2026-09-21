import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { createClient } from '@libsql/client';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  statfs,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import {
  BackupArchiveError,
  extractBackupArchive,
  listImageFiles,
  writeBackupArchive,
} from './backup-archive';
import {
  buildBackupName,
  compareBackupNamesNewestFirst,
  formatBackupTimestamp,
  getBackupKind,
  getBackupPaths,
  isBackupName,
  parseBackupKeep,
  type BackupKind,
  type BackupPaths,
} from './backup-paths';
import {
  getRestoreStaging,
  markRestoreReady,
  readLastRestore,
  removeRestoreStaging,
} from './pending-restore';

export type BackupSummary = {
  createdAt: string;
  kind: BackupKind;
  name: string;
  size: number;
};

type BusyState = 'backup' | 'restore' | null;

export type BackupsOptions = {
  keep: number;
  paths: BackupPaths;
};

// Tests hand in temporary folders; the app reads everything from the env.
export const BACKUPS_OPTIONS = Symbol('BACKUPS_OPTIONS');

const TEMPORARY_PREFIX = '.tmp-';
const FREE_SPACE_MARGIN_BYTES = 32 * 1024 * 1024;
// Long enough for the HTTP response to reach the admin before the process goes.
const RESTART_DELAY_MS = 1_000;

function parseTimestampFromName(name: string) {
  const match = /^foliart-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(
    name,
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

export async function sha256File(path: string) {
  const hash = createHash('sha256');

  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
}

function openDatabase(path: string) {
  return createClient({ url: `file:${path}` });
}

async function readAppliedMigrations(path: string) {
  const client = openDatabase(path);

  try {
    const result = await client.execute(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
    );

    return new Set(
      result.rows.map((row) => String(row.migration_name as string)),
    );
  } finally {
    client.close();
  }
}

@Injectable()
export class BackupsService implements OnModuleInit {
  private readonly logger = new Logger(BackupsService.name);
  private readonly keep: number;
  private readonly paths: BackupPaths;
  private busy: BusyState = null;
  private restartScheduled = false;

  constructor(@Optional() @Inject(BACKUPS_OPTIONS) options?: BackupsOptions) {
    this.paths = options?.paths ?? getBackupPaths();
    this.keep = options?.keep ?? parseBackupKeep();
  }

  async onModuleInit() {
    await mkdir(this.paths.backupDir, { recursive: true, mode: 0o700 });

    // Work folders of a backup that was cut off by a crash or a restart.
    for (const entry of await readdir(this.paths.backupDir)) {
      if (entry.startsWith(TEMPORARY_PREFIX)) {
        await rm(join(this.paths.backupDir, entry), {
          recursive: true,
          force: true,
        });
      }
    }
  }

  async list() {
    const entries = await readdir(this.paths.backupDir).catch(() => []);
    const backups = await Promise.all(
      entries.filter(isBackupName).map((name) => this.describe(name)),
    );

    backups.sort((left, right) =>
      compareBackupNamesNewestFirst(left.name, right.name),
    );

    return {
      backups,
      busy: this.restartScheduled ? ('restore' as const) : this.busy,
      keep: this.keep,
      lastRestore: await readLastRestore(this.paths),
    };
  }

  create() {
    return this.exclusive('backup', () => this.createBackup('manual'));
  }

  remove(name: string) {
    return this.exclusive('backup', async () => {
      const archive = this.requireArchive(name);
      await rm(archive, { force: true });
      await rm(`${archive}.sha256`, { force: true });
    });
  }

  async openDownload(name: string) {
    const archive = this.requireArchive(name);
    const { size } = await stat(archive);

    return { size, stream: createReadStream(archive) };
  }

  /**
   * Verifies the archive, stages its files next to the live ones, saves a
   * safety backup of the current state and restarts the process;
   * `applyPendingRestore` swaps the files in on the next start. Nothing live is
   * touched until then, so any failure here leaves the site as it was.
   */
  prepareRestore(name: string) {
    return this.exclusive('restore', async () => {
      const archive = this.requireArchive(name);
      await this.verifyChecksum(archive);
      await this.ensureFreeSpace(2);
      await removeRestoreStaging(this.paths);

      const staging = getRestoreStaging(this.paths);
      // Echoed back so the admin panel can tell this restore's result from an
      // earlier one once the backend is up again.
      const requestedAt = new Date().toISOString();
      let safetyBackup: BackupSummary;

      try {
        await mkdir(staging.data, { recursive: true, mode: 0o700 });
        await mkdir(staging.newImages, { recursive: true });
        await extractBackupArchive(archive, {
          databaseName: this.paths.databaseName,
          databaseTarget: staging.database,
          imagesTarget: staging.newImages,
        }).catch((error: unknown) => {
          // gzip and tar parse errors mean a broken file, not a server fault.
          throw error instanceof BackupArchiveError
            ? error
            : new BackupArchiveError(String(error));
        });
        await this.checkRestoredDatabase(staging.database);
        safetyBackup = await this.createBackup('before-restore', [name]);
        await markRestoreReady(this.paths, { archive: name, requestedAt });
      } catch (error) {
        await removeRestoreStaging(this.paths);

        if (error instanceof BackupArchiveError) {
          this.logger.warn(`Refused to restore ${name}: ${error.message}`);
          throw new BadRequestException(
            'Архив повреждён или содержит недопустимые файлы.',
          );
        }

        throw error;
      }

      this.restartScheduled = true;
      this.logger.log(
        `Restore from ${name} staged; restarting to apply it (safety backup ${safetyBackup.name}).`,
      );
      this.scheduleRestart();

      return { requestedAt, safetyBackup: safetyBackup.name };
    });
  }

  // The container runs with `restart: unless-stopped`, so exiting is how the
  // backend gets a fresh start with no open database connection.
  protected scheduleRestart() {
    setTimeout(() => process.exit(0), RESTART_DELAY_MS);
  }

  private async exclusive<T>(
    state: Exclude<BusyState, null>,
    task: () => Promise<T>,
  ) {
    if (this.restartScheduled) {
      throw new ConflictException(
        'Идёт восстановление: сайт перезапускается. Подождите минуту.',
      );
    }

    if (this.busy) {
      throw new ConflictException(
        this.busy === 'restore'
          ? 'Уже идёт восстановление из резервной копии.'
          : 'Уже выполняется операция с резервными копиями. Повторите через минуту.',
      );
    }

    this.busy = state;

    try {
      return await task();
    } finally {
      this.busy = null;
    }
  }

  private async describe(name: string): Promise<BackupSummary> {
    const info = await stat(join(this.paths.backupDir, name));

    return {
      createdAt: parseTimestampFromName(name) ?? info.mtime.toISOString(),
      kind: getBackupKind(name),
      name,
      size: info.size,
    };
  }

  private requireArchive(name: string) {
    if (!isBackupName(name)) {
      throw new BadRequestException('Некорректное имя резервной копии.');
    }

    const archive = join(this.paths.backupDir, name);

    if (!existsSync(archive)) {
      throw new NotFoundException('Резервная копия не найдена.');
    }

    return archive;
  }

  private async verifyChecksum(archive: string) {
    const expected = await readFile(`${archive}.sha256`, 'utf8')
      .then((content) => content.trim().split(/\s+/)[0]?.toLowerCase())
      .catch(() => null);

    if (!expected || !/^[0-9a-f]{64}$/.test(expected)) {
      throw new BadRequestException(
        'У резервной копии нет контрольной суммы — восстановление отменено.',
      );
    }

    if ((await sha256File(archive)) !== expected) {
      throw new BadRequestException(
        'Контрольная сумма не совпадает: файл резервной копии повреждён.',
      );
    }
  }

  private async estimateSiteSize() {
    let total = (await stat(this.paths.databasePath)).size;

    for (const file of await listImageFiles(this.paths.imagesDir)) {
      total += (await stat(join(this.paths.imagesDir, file))).size;
    }

    return total;
  }

  private async ensureFreeSpace(copies: number) {
    const [needed, disk] = await Promise.all([
      this.estimateSiteSize(),
      statfs(this.paths.backupDir),
    ]);
    const available = disk.bavail * disk.bsize;

    if (available < needed * copies + FREE_SPACE_MARGIN_BYTES) {
      throw new HttpException(
        'На сервере недостаточно свободного места. Удалите старые резервные копии.',
        HttpStatus.INSUFFICIENT_STORAGE,
      );
    }
  }

  private async checkDatabase(
    path: string,
    pragma: 'quick_check' | 'integrity_check',
  ) {
    const client = openDatabase(path);

    try {
      const result = await client.execute(`PRAGMA ${pragma}`);
      const value = result.rows[0] ? Object.values(result.rows[0])[0] : null;

      if (value !== 'ok') {
        throw new Error(
          `SQLite ${pragma} failed: ${typeof value === 'string' ? value : typeof value}`,
        );
      }
    } finally {
      client.close();
    }
  }

  private async checkRestoredDatabase(path: string) {
    try {
      await this.checkDatabase(path, 'integrity_check');
    } catch (error) {
      this.logger.warn(`Backup database check failed: ${String(error)}`);
      throw new BadRequestException(
        'База данных в резервной копии повреждена.',
      );
    }

    // Migrations only run when the stack is deployed, not on a plain restart,
    // so a database from another schema version cannot be swapped in here.
    const [restored, current] = await Promise.all([
      readAppliedMigrations(path).catch(() => null),
      readAppliedMigrations(this.paths.databasePath),
    ]);
    const sameSchema =
      restored !== null &&
      restored.size === current.size &&
      [...current].every((migration) => restored.has(migration));

    if (!sameSchema) {
      throw new BadRequestException(
        'Резервная копия сделана на другой версии сайта. Восстановить её может только разработчик (scripts/restore.sh).',
      );
    }

    const client = openDatabase(path);

    try {
      const result = await client.execute(
        'SELECT COUNT(*) AS count FROM AdminUser WHERE isSuperAdmin = 1',
      );

      if (Number(result.rows[0]?.count ?? 0) < 1) {
        throw new BadRequestException(
          'В резервной копии нет супер-администратора — после восстановления никто не смог бы войти в админку.',
        );
      }
    } finally {
      client.close();
    }
  }

  // The same-second counter only grows: reusing a slot freed by pruning would
  // sort the new archive below older ones of that second.
  private async nextBackupName(kind: BackupKind) {
    const now = new Date();
    const stamp = formatBackupTimestamp(now);
    const counters = (await readdir(this.paths.backupDir))
      .filter(isBackupName)
      .map((name) => /^foliart-(\d{8}T\d{6}Z)(?:-(\d+))?/.exec(name))
      .filter((match) => match?.[1] === stamp)
      .map((match) => Number(match?.[2] ?? 0));
    const suffix = counters.length ? Math.max(...counters) + 1 : 0;

    if (suffix > 999) {
      throw new ConflictException(
        'Не удалось подобрать имя для резервной копии.',
      );
    }

    return buildBackupName(now, kind, suffix);
  }

  private async createBackup(kind: BackupKind, protectedNames: string[] = []) {
    await mkdir(this.paths.backupDir, { recursive: true, mode: 0o700 });
    await this.ensureFreeSpace(1);

    const name = await this.nextBackupName(kind);
    const archive = join(this.paths.backupDir, name);
    const workDir = await mkdtemp(join(this.paths.backupDir, TEMPORARY_PREFIX));

    try {
      // VACUUM INTO writes a consistent copy while the site keeps running;
      // uploads that land afterwards are simply not part of this snapshot.
      const snapshot = join(workDir, this.paths.databaseName);
      const client = openDatabase(this.paths.databasePath);

      try {
        await client.execute({ sql: 'VACUUM INTO ?', args: [snapshot] });
      } finally {
        client.close();
      }

      await this.checkDatabase(snapshot, 'quick_check');

      const temporaryArchive = join(workDir, 'archive.tar.gz');
      const checksum = await writeBackupArchive({
        databaseName: this.paths.databaseName,
        databaseSnapshot: snapshot,
        imagesDir: this.paths.imagesDir,
        target: temporaryArchive,
      });

      // Same format as `sha256sum`, so `sha256sum -c` and `restore.sh` accept it.
      await writeFile(`${archive}.sha256`, `${checksum}  ${name}\n`, {
        mode: 0o600,
      });
      await rename(temporaryArchive, archive);
    } catch (error) {
      await rm(`${archive}.sha256`, { force: true });
      this.logger.error(`Backup ${name} failed: ${String(error)}`);
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }

    this.logger.log(`Backup created: ${name}`);
    await this.prune([name, ...protectedNames]);

    return this.describe(name);
  }

  // Keeps the newest `keep` archives. Checksums whose archive is gone are
  // dropped too, and the names in `protectedNames` always survive.
  private async prune(protectedNames: string[]) {
    const entries = await readdir(this.paths.backupDir);
    const archives = entries
      .filter(isBackupName)
      .sort(compareBackupNamesNewestFirst);
    const expired = archives
      .slice(this.keep)
      .filter((name) => !protectedNames.includes(name));

    for (const name of expired) {
      await rm(join(this.paths.backupDir, name), { force: true });
      await rm(join(this.paths.backupDir, `${name}.sha256`), { force: true });
    }

    const remaining = new Set(
      archives.filter((name) => !expired.includes(name)),
    );

    for (const entry of entries) {
      if (entry.endsWith('.sha256') && !remaining.has(entry.slice(0, -7))) {
        await rm(join(this.paths.backupDir, entry), { force: true });
      }
    }
  }
}
