import { existsSync } from 'node:fs';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { RESTORE_STAGING_NAME, type BackupPaths } from './backup-paths';

export type RestoreMarker = {
  archive: string;
  requestedAt: string;
};

export type LastRestore = RestoreMarker & {
  finishedAt: string;
  message?: string;
  status: 'ok' | 'failed';
};

export const LAST_RESTORE_FILE = 'last-restore.json';

const READY_FILE = 'READY';
const STAGED_DATABASE = 'db';
const NEW_IMAGES = 'new';
const OLD_IMAGES = 'old';
// Phase markers: each one is written only after its step fully succeeded, so
// a restart in the middle of a restore resumes instead of redoing a step whose
// inputs have already moved.
const OLD_MOVED = 'OLD_MOVED';
const NEW_MOVED = 'NEW_MOVED';

export function getRestoreStaging(paths: BackupPaths) {
  const data = join(paths.dataDir, RESTORE_STAGING_NAME);
  const images = join(paths.imagesDir, RESTORE_STAGING_NAME);

  return {
    data,
    database: join(data, STAGED_DATABASE),
    images,
    newImages: join(images, NEW_IMAGES),
    ready: join(data, READY_FILE),
  };
}

export async function removeRestoreStaging(paths: BackupPaths) {
  const staging = getRestoreStaging(paths);
  await rm(staging.data, { recursive: true, force: true });
  await rm(staging.images, { recursive: true, force: true });
}

export async function markRestoreReady(
  paths: BackupPaths,
  marker: RestoreMarker,
) {
  await writeFile(getRestoreStaging(paths).ready, JSON.stringify(marker), {
    mode: 0o600,
  });
}

export async function readLastRestore(
  paths: BackupPaths,
): Promise<LastRestore | null> {
  try {
    return JSON.parse(
      await readFile(join(paths.backupDir, LAST_RESTORE_FILE), 'utf8'),
    ) as LastRestore;
  } catch {
    return null;
  }
}

async function writeLastRestore(paths: BackupPaths, result: LastRestore) {
  await mkdir(paths.backupDir, { recursive: true, mode: 0o700 });
  await writeFile(
    join(paths.backupDir, LAST_RESTORE_FILE),
    JSON.stringify(result),
    { mode: 0o600 },
  );
}

async function moveEntries(
  from: string,
  to: string,
  skip?: string,
): Promise<void> {
  for (const entry of await readdir(from)) {
    if (entry !== skip) {
      await rename(join(from, entry), join(to, entry));
    }
  }
}

async function swapImages(paths: BackupPaths) {
  const staging = getRestoreStaging(paths);
  const oldImages = join(staging.images, OLD_IMAGES);

  if (!existsSync(join(staging.images, OLD_MOVED))) {
    await mkdir(oldImages, { recursive: true });
    await moveEntries(paths.imagesDir, oldImages, RESTORE_STAGING_NAME);
    await writeFile(join(staging.images, OLD_MOVED), '');
  }

  if (!existsSync(join(staging.images, NEW_MOVED))) {
    await mkdir(staging.newImages, { recursive: true });
    await moveEntries(staging.newImages, paths.imagesDir);
    await writeFile(join(staging.images, NEW_MOVED), '');
  }
}

async function swapDatabase(paths: BackupPaths) {
  const staging = getRestoreStaging(paths);

  if (!existsSync(staging.database)) {
    // Already moved into place by an earlier, interrupted run.
    return;
  }

  // A journal left by the old database would be replayed into the restored
  // one on the next open and corrupt it, so it goes first.
  for (const suffix of ['-wal', '-shm', '-journal']) {
    await rm(`${paths.databasePath}${suffix}`, { force: true });
  }

  await rename(staging.database, paths.databasePath);
}

/**
 * Applies a restore prepared by `BackupsService.prepareRestore`. Runs at
 * startup before anything opens the database: swapping the SQLite file under a
 * live Prisma connection is not safe, so the service only stages the files and
 * restarts the process, and the swap happens here.
 *
 * Without a READY marker the staging folders are leftovers of an interrupted
 * preparation and are simply discarded. A failure while applying is rethrown so
 * the backend does not start on a half-restored state; the next start resumes.
 */
export async function applyPendingRestore(
  paths: BackupPaths,
  log: (message: string) => void = console.log,
): Promise<LastRestore | null> {
  const staging = getRestoreStaging(paths);

  if (!existsSync(staging.ready)) {
    await removeRestoreStaging(paths);
    return null;
  }

  const marker = JSON.parse(
    await readFile(staging.ready, 'utf8'),
  ) as RestoreMarker;
  log(`Applying restore from backup ${marker.archive}...`);

  try {
    await swapImages(paths);
    await swapDatabase(paths);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeLastRestore(paths, {
      ...marker,
      finishedAt: new Date().toISOString(),
      message,
      status: 'failed',
    }).catch(() => undefined);
    log(`Restore from ${marker.archive} failed: ${message}`);
    throw error;
  }

  const result: LastRestore = {
    ...marker,
    finishedAt: new Date().toISOString(),
    status: 'ok',
  };
  await writeLastRestore(paths, result);
  // READY goes before the image staging: once it is gone a later start treats
  // whatever is left as disposable instead of swapping the images again.
  await rm(staging.data, { recursive: true, force: true });
  await rm(staging.images, { recursive: true, force: true });
  log(`Restore from ${marker.archive} applied.`);

  return result;
}
