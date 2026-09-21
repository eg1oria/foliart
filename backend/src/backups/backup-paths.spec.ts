import {
  buildBackupName,
  compareBackupNamesNewestFirst,
  getBackupKind,
  getBackupPaths,
  isBackupName,
  parseBackupKeep,
  resolveDatabasePath,
} from './backup-paths';

describe('backup paths', () => {
  it('builds names the validator accepts', () => {
    const date = new Date('2026-09-18T10:20:30.456Z');

    expect(buildBackupName(date, 'manual')).toBe(
      'foliart-20260918T102030Z.tar.gz',
    );
    expect(buildBackupName(date, 'before-restore', 2)).toBe(
      'foliart-20260918T102030Z-2-before-restore.tar.gz',
    );
    expect(isBackupName(buildBackupName(date, 'manual', 3))).toBe(true);
    expect(getBackupKind(buildBackupName(date, 'before-restore'))).toBe(
      'before-restore',
    );
  });

  it.each([
    '../foliart-20260918T102030Z.tar.gz',
    'foliart-20260918T102030Z.tar.gz.sha256',
    'foliart-20260918T102030Z.tar',
    'foliart-latest.tar.gz',
    'last-restore.json',
    '',
  ])('rejects %p', (name) => {
    expect(isBackupName(name)).toBe(false);
  });

  it('orders same-second backups by their counter', () => {
    expect(
      [
        'foliart-20260918T102030Z.tar.gz',
        'foliart-20260918T102030Z-2.tar.gz',
        'foliart-20260917T235959Z-9.tar.gz',
        'foliart-20260918T102030Z-1-before-restore.tar.gz',
      ].sort(compareBackupNamesNewestFirst),
    ).toEqual([
      'foliart-20260918T102030Z-2.tar.gz',
      'foliart-20260918T102030Z-1-before-restore.tar.gz',
      'foliart-20260918T102030Z.tar.gz',
      'foliart-20260917T235959Z-9.tar.gz',
    ]);
  });

  it('resolves the SQLite file from DATABASE_URL', () => {
    expect(resolveDatabasePath('file:/app/data/prod.db', '/app')).toBe(
      '/app/data/prod.db',
    );
    expect(resolveDatabasePath('file:./dev.db?mode=rwc', '/srv/backend')).toBe(
      '/srv/backend/dev.db',
    );
    expect(() =>
      resolveDatabasePath('file:/app/data/../etc/db', '/app'),
    ).toThrow();
    expect(() => resolveDatabasePath('postgres://host/db', '/app')).toThrow();
  });

  it('derives every folder from the environment', () => {
    expect(
      getBackupPaths({ DATABASE_URL: 'file:/app/data/prod.db' }, '/app'),
    ).toEqual({
      backupDir: '/app/backups',
      dataDir: '/app/data',
      databaseName: 'prod.db',
      databasePath: '/app/data/prod.db',
      imagesDir: '/app/images',
    });
    expect(
      getBackupPaths(
        { DATABASE_URL: 'file:/app/data/prod.db', BACKUP_DIR: '/var/b' },
        '/app',
      ).backupDir,
    ).toBe('/var/b');
  });

  it('falls back to the default retention on bad input', () => {
    expect(parseBackupKeep(undefined)).toBe(10);
    expect(parseBackupKeep('3')).toBe(3);
    expect(parseBackupKeep('0')).toBe(10);
    expect(parseBackupKeep('abc')).toBe(10);
  });
});
