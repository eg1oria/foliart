import { Logger } from '@nestjs/common';
import { createClient } from '@libsql/client';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BackupPaths } from './backup-paths';
import { BackupsService, sha256File } from './backups.service';
import { applyPendingRestore } from './pending-restore';

class TestBackupsService extends BackupsService {
  restarts = 0;

  protected scheduleRestart() {
    this.restarts += 1;
  }
}

async function query(path: string, sql: string) {
  const client = createClient({ url: `file:${path}` });

  try {
    return (await client.execute(sql)).rows;
  } finally {
    client.close();
  }
}

describe('BackupsService', () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  let root: string;
  let paths: BackupPaths;
  let service: TestBackupsService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'foliart-backups-'));
    paths = {
      backupDir: join(root, 'backups'),
      dataDir: join(root, 'data'),
      databaseName: 'prod.db',
      databasePath: join(root, 'data', 'prod.db'),
      imagesDir: join(root, 'images'),
    };
    await mkdir(paths.dataDir, { recursive: true });
    await mkdir(join(paths.imagesDir, 'products'), { recursive: true });
    // The tracked seed database carries every migration and a super admin.
    await copyFile(join(__dirname, '..', '..', 'dev.db'), paths.databasePath);
    await writeFile(join(paths.imagesDir, 'products', 'a.webp'), 'image-a');
    service = new TestBackupsService({ keep: 3, paths });
    await service.onModuleInit();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('creates an archive that tar and sha256sum both accept', async () => {
    const backup = await service.create();
    const archive = join(paths.backupDir, backup.name);

    expect(backup.kind).toBe('manual');
    expect(
      (await readFile(`${archive}.sha256`, 'utf8')).startsWith(
        await sha256File(archive),
      ),
    ).toBe(true);
    expect(
      execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })
        .trim()
        .split('\n'),
    ).toEqual(['data/prod.db', 'images/products/a.webp']);
    expect((await service.list()).backups.map((item) => item.name)).toEqual([
      backup.name,
    ]);
    expect(
      (await readdir(paths.backupDir)).filter((entry) =>
        entry.startsWith('.tmp-'),
      ),
    ).toEqual([]);
  });

  it('keeps only the newest archives', async () => {
    const names: string[] = [];

    for (let index = 0; index < 5; index += 1) {
      names.push((await service.create()).name);
    }

    const remaining = (await service.list()).backups.map((item) => item.name);
    expect(remaining).toHaveLength(3);
    expect(remaining).toContain(names[4]);
    expect(remaining).not.toContain(names[0]);
    expect(
      (await readdir(paths.backupDir)).filter((entry) =>
        entry.endsWith('.sha256'),
      ),
    ).toHaveLength(3);
  });

  it('restores the database and images after a restart', async () => {
    const backup = await service.create();
    await query(paths.databasePath, "UPDATE Product SET name = 'changed'");
    await writeFile(join(paths.imagesDir, 'products', 'b.webp'), 'image-b');

    const { safetyBackup } = await service.prepareRestore(backup.name);
    expect(safetyBackup).toMatch(/-before-restore\.tar\.gz$/);
    expect(service.restarts).toBe(1);
    // Nothing live changes until the next start.
    expect(await readdir(join(paths.imagesDir, 'products'))).toContain(
      'b.webp',
    );
    await expect(service.create()).rejects.toThrow(/перезапускается/);

    await applyPendingRestore(paths, () => undefined);

    expect(
      await query(
        paths.databasePath,
        "SELECT COUNT(*) AS n FROM Product WHERE name = 'changed'",
      ),
    ).toEqual([{ n: 0 }]);
    expect(await readdir(join(paths.imagesDir, 'products'))).toEqual([
      'a.webp',
    ]);
  });

  it('refuses a tampered archive and leaves no staging behind', async () => {
    const backup = await service.create();
    await writeFile(join(paths.backupDir, backup.name), 'tampered');

    await expect(service.prepareRestore(backup.name)).rejects.toThrow(
      /Контрольная сумма/,
    );
    expect(service.restarts).toBe(0);
  });

  it('refuses a backup taken on another schema version', async () => {
    const backup = await service.create();
    await query(
      paths.databasePath,
      "INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES ('x', 'x', '29990101000000_future', CURRENT_TIMESTAMP, 1)",
    );

    await expect(service.prepareRestore(backup.name)).rejects.toThrow(
      /другой версии сайта/,
    );
    expect(await readdir(paths.dataDir)).toEqual(['prod.db']);
    expect(await readdir(paths.imagesDir)).toEqual(['products']);
  });

  it('rejects names outside the backup pattern', async () => {
    await expect(service.openDownload('../data/prod.db')).rejects.toThrow(
      /Некорректное имя/,
    );
  });
});
