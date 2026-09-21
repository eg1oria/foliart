import { describe, expect, it } from 'vitest';

import { formatBackupSize, getBackupDownloadHref, isBackupName } from './backups';

describe('backups', () => {
  it('accepts only backend archive names', () => {
    expect(isBackupName('foliart-20260918T102030Z.tar.gz')).toBe(true);
    expect(isBackupName('foliart-20260918T102030Z-2-before-restore.tar.gz')).toBe(true);
    expect(isBackupName('../foliart-20260918T102030Z.tar.gz')).toBe(false);
    expect(isBackupName('foliart-20260918T102030Z.tar.gz/restore')).toBe(false);
    expect(isBackupName(null)).toBe(false);
  });

  it('formats sizes in Russian units', () => {
    expect(formatBackupSize(512)).toBe('512 Б');
    expect(formatBackupSize(15 * 1024 * 1024)).toBe('15 МБ');
    expect(formatBackupSize(1.5 * 1024 * 1024)).toBe('1,5 МБ');
  });

  it('builds the download link', () => {
    expect(getBackupDownloadHref('foliart-20260918T102030Z.tar.gz')).toBe(
      '/admin-api/backups/download/foliart-20260918T102030Z.tar.gz',
    );
  });
});
