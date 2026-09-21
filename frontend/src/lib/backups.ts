export type BackupKind = 'manual' | 'before-restore';

export type BackupSummary = {
  createdAt: string;
  kind: BackupKind;
  name: string;
  size: number;
};

export type LastRestore = {
  archive: string;
  finishedAt: string;
  message?: string;
  requestedAt: string;
  status: 'ok' | 'failed';
};

export type BackupsOverview = {
  backups: BackupSummary[];
  busy: 'backup' | 'restore' | null;
  keep: number;
  lastRestore: LastRestore | null;
};

/** What `/admin-api/backups/status` answers while a restore is under way. */
export type BackupRestoreStatus =
  | { state: 'restarting' }
  | { lastRestore: LastRestore | null; state: 'ready' | 'relogin' };

/** Typed by the admin in the restore dialog, and checked again on the server. */
export const RESTORE_CONFIRMATION_WORD = 'ВОССТАНОВИТЬ';

// Mirrors `isBackupName` in the backend: the name is the only thing the admin
// sends, and it ends up in a backend URL.
const backupNamePattern = /^foliart-\d{8}T\d{6}Z(?:-\d{1,3})?(?:-before-restore)?\.tar\.gz$/;

export function isBackupName(value: unknown): value is string {
  return typeof value === 'string' && backupNamePattern.test(value);
}

export function getBackupDownloadHref(name: string) {
  return `/admin-api/backups/download/${encodeURIComponent(name)}`;
}

export function formatBackupSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;

  const units = ['КБ', 'МБ', 'ГБ'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

// Rendered on the server, whose clock is UTC in production, so the zone is
// fixed and named instead of following wherever the page happens to render.
export function formatBackupDate(value: string) {
  return `${new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  })} МСК`;
}
