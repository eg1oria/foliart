import { basename, dirname, join, resolve } from 'node:path';

export type BackupKind = 'manual' | 'before-restore';

export type BackupPaths = {
  backupDir: string;
  dataDir: string;
  databaseName: string;
  databasePath: string;
  imagesDir: string;
};

// `-N` breaks ties between two backups taken in the same second, and the
// `-before-restore` suffix marks the safety copy made right before a restore.
const BACKUP_NAME_PATTERN =
  /^foliart-(\d{8}T\d{6}Z)(?:-(\d{1,3}))?(-before-restore)?\.tar\.gz$/;

export const DEFAULT_BACKUP_KEEP = 10;

// Staging folders created inside the live data and images volumes. They sit on
// the same filesystem as the files they replace, so a restore can `rename`
// instead of copying, and the leading dot keeps them out of the static server.
export const RESTORE_STAGING_NAME = '.restore';

export function isBackupName(value: unknown): value is string {
  return typeof value === 'string' && BACKUP_NAME_PATTERN.test(value);
}

/** Newest first: by timestamp, then by the same-second `-N` counter. */
export function compareBackupNamesNewestFirst(left: string, right: string) {
  const parse = (name: string) => {
    const match = BACKUP_NAME_PATTERN.exec(name);

    return { stamp: match?.[1] ?? '', counter: Number(match?.[2] ?? 0) };
  };
  const a = parse(left);
  const b = parse(right);

  return (
    b.stamp.localeCompare(a.stamp) ||
    b.counter - a.counter ||
    right.localeCompare(left)
  );
}

export function getBackupKind(name: string): BackupKind {
  return name.endsWith('-before-restore.tar.gz') ? 'before-restore' : 'manual';
}

export function formatBackupTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
}

export function buildBackupName(date: Date, kind: BackupKind, suffix = 0) {
  return [
    'foliart-',
    formatBackupTimestamp(date),
    suffix ? `-${suffix}` : '',
    kind === 'before-restore' ? '-before-restore' : '',
    '.tar.gz',
  ].join('');
}

/**
 * Same rules as `docker-entrypoint.sh` and `scripts/backup.sh`: only a local
 * SQLite file is supported, and a path that climbs out of its directory is
 * refused rather than normalised.
 */
export function resolveDatabasePath(
  databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db',
  cwd = process.cwd(),
) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Backups support only a SQLite DATABASE_URL (file:...)');
  }

  const rawPath = databaseUrl.slice('file:'.length).split('?')[0];

  if (!rawPath || rawPath.split(/[\\/]/).includes('..')) {
    throw new Error(`Unsafe SQLite path in DATABASE_URL: ${rawPath}`);
  }

  return resolve(cwd, rawPath);
}

export function parseBackupKeep(value = process.env.BACKUP_KEEP) {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_BACKUP_KEEP;
  }

  const keep = Number(value);

  return Number.isSafeInteger(keep) && keep >= 1 ? keep : DEFAULT_BACKUP_KEEP;
}

export function getBackupPaths(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): BackupPaths {
  const databasePath = resolveDatabasePath(
    env.DATABASE_URL ?? 'file:./dev.db',
    cwd,
  );

  return {
    backupDir: resolve(cwd, env.BACKUP_DIR || join(cwd, 'backups')),
    dataDir: dirname(databasePath),
    databaseName: basename(databasePath),
    databasePath,
    // `main.ts` serves uploads from the same folder.
    imagesDir: join(cwd, 'images'),
  };
}
