import { existsSync } from 'node:fs';
import {
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
import {
  applyPendingRestore,
  getRestoreStaging,
  markRestoreReady,
  readLastRestore,
} from './pending-restore';

describe('applyPendingRestore', () => {
  let root: string;
  let paths: BackupPaths;
  const silent = () => undefined;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'foliart-restore-'));
    paths = {
      backupDir: join(root, 'backups'),
      dataDir: join(root, 'data'),
      databaseName: 'prod.db',
      databasePath: join(root, 'data', 'prod.db'),
      imagesDir: join(root, 'images'),
    };
    await mkdir(join(paths.imagesDir, 'products'), { recursive: true });
    await mkdir(paths.dataDir, { recursive: true });
    await writeFile(paths.databasePath, 'old-db');
    await writeFile(`${paths.databasePath}-wal`, 'old-wal');
    await writeFile(join(paths.imagesDir, 'products', 'old.webp'), 'old');
    await writeFile(join(paths.imagesDir, 'hero.webp'), 'old-hero');

    const staging = getRestoreStaging(paths);
    await mkdir(join(staging.newImages, 'products'), { recursive: true });
    await mkdir(staging.data, { recursive: true });
    await writeFile(staging.database, 'new-db');
    await writeFile(join(staging.newImages, 'products', 'new.webp'), 'new');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function expectRestored() {
    expect(await readFile(paths.databasePath, 'utf8')).toBe('new-db');
    expect(existsSync(`${paths.databasePath}-wal`)).toBe(false);
    expect((await readdir(paths.imagesDir)).sort()).toEqual(['products']);
    expect(await readdir(join(paths.imagesDir, 'products'))).toEqual([
      'new.webp',
    ]);
    expect(existsSync(getRestoreStaging(paths).data)).toBe(false);
    expect(existsSync(getRestoreStaging(paths).images)).toBe(false);
    expect(await readLastRestore(paths)).toMatchObject({
      archive: 'foliart-20260918T000000Z.tar.gz',
      status: 'ok',
    });
  }

  it('discards staging that was never marked ready', async () => {
    await expect(applyPendingRestore(paths, silent)).resolves.toBeNull();

    expect(await readFile(paths.databasePath, 'utf8')).toBe('old-db');
    expect(existsSync(getRestoreStaging(paths).data)).toBe(false);
    expect(existsSync(getRestoreStaging(paths).images)).toBe(false);
  });

  it('swaps in the staged database and images', async () => {
    await markRestoreReady(paths, {
      archive: 'foliart-20260918T000000Z.tar.gz',
      requestedAt: '2026-09-18T00:00:00.000Z',
    });

    await applyPendingRestore(paths, silent);
    await expectRestored();
  });

  it('resumes after being cut off between the image phases', async () => {
    await markRestoreReady(paths, {
      archive: 'foliart-20260918T000000Z.tar.gz',
      requestedAt: '2026-09-18T00:00:00.000Z',
    });
    // Simulate a crash right after the old images were moved aside and one new
    // entry was already put in place.
    const staging = getRestoreStaging(paths);
    await mkdir(join(staging.images, 'old'), { recursive: true });
    for (const entry of ['products', 'hero.webp']) {
      await rm(join(paths.imagesDir, entry), { recursive: true });
    }
    await writeFile(join(staging.images, 'OLD_MOVED'), '');

    await applyPendingRestore(paths, silent);
    await expectRestored();
  });

  it('resumes after the database was already moved', async () => {
    await markRestoreReady(paths, {
      archive: 'foliart-20260918T000000Z.tar.gz',
      requestedAt: '2026-09-18T00:00:00.000Z',
    });
    const staging = getRestoreStaging(paths);
    await applyPendingRestore(paths, silent);
    // Re-create the READY marker as if the process died before deleting it.
    await mkdir(staging.data, { recursive: true });
    await markRestoreReady(paths, {
      archive: 'foliart-20260918T000000Z.tar.gz',
      requestedAt: '2026-09-18T00:00:00.000Z',
    });
    await mkdir(staging.images, { recursive: true });
    await writeFile(join(staging.images, 'OLD_MOVED'), '');
    await writeFile(join(staging.images, 'NEW_MOVED'), '');

    await applyPendingRestore(paths, silent);
    await expectRestored();
  });
});
