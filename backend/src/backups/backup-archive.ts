import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, type Dirent } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';
import * as tar from 'tar-stream';
import { RESTORE_STAGING_NAME } from './backup-paths';

export class BackupArchiveError extends Error {}

type WriteArchiveOptions = {
  databaseName: string;
  databaseSnapshot: string;
  imagesDir: string;
  target: string;
};

type ExtractArchiveOptions = {
  databaseName: string;
  databaseTarget: string;
  imagesTarget: string;
};

/**
 * Every regular file under `imagesDir`, relative to it, in a stable order.
 * Symlinks are skipped rather than followed so an archive can never pick up
 * anything outside the uploads folder, and the restore staging folder is left
 * out so a backup taken mid-restore does not nest the next image set.
 */
export async function listImageFiles(imagesDir: string) {
  const files: string[] = [];

  async function walk(directory: string) {
    let entries: Dirent[];

    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolute = join(directory, entry.name);

      if (directory === imagesDir && entry.name === RESTORE_STAGING_NAME) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(relative(imagesDir, absolute).split(sep).join('/'));
      }
    }
  }

  await walk(imagesDir);

  return files;
}

async function addFile(pack: tar.Pack, name: string, source: string) {
  const info = await stat(source);
  let finish!: (error?: Error | null) => void;
  const written = new Promise<void>((resolve, reject) => {
    finish = (error) => (error ? reject(error) : resolve());
  });
  const entry = pack.entry(
    {
      name,
      size: info.size,
      mode: 0o644,
      mtime: info.mtime,
      type: 'file',
    },
    finish,
  );

  for await (const chunk of createReadStream(source)) {
    if (!entry.write(chunk)) {
      await new Promise<void>((resolve) =>
        entry.once('drain', () => resolve()),
      );
    }
  }

  entry.end(undefined);
  await written;
}

/**
 * Writes the same layout as `scripts/backup.sh` — `data/<database>` next to
 * `images/...` — so an archive made from the admin panel can also be restored
 * with `scripts/restore.sh`. Returns the SHA-256 of the compressed file.
 */
export async function writeBackupArchive({
  databaseName,
  databaseSnapshot,
  imagesDir,
  target,
}: WriteArchiveOptions) {
  const pack = tar.pack();
  const hash = createHash('sha256');
  const hashTap = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  const done = pipeline(
    pack,
    createGzip(),
    hashTap,
    createWriteStream(target, { flags: 'wx', mode: 0o600 }),
  );

  try {
    await addFile(pack, `data/${databaseName}`, databaseSnapshot);

    for (const file of await listImageFiles(imagesDir)) {
      await addFile(pack, `images/${file}`, join(imagesDir, file));
    }

    pack.finalize();
  } catch (error) {
    pack.destroy(error as Error);
    await done.catch(() => undefined);
    throw error;
  }

  await done;

  return hash.digest('hex');
}

// Relative, forward-slash, no `.`/`..`/empty segments — anything else could
// escape the staging folder when joined.
function splitSafePath(name: string) {
  const trimmed = name.replace(/\/+$/, '');

  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('\\')) {
    return null;
  }

  const segments = trimmed.split('/');

  if (
    segments.some(
      (segment) =>
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('\0'),
    )
  ) {
    return null;
  }

  return segments;
}

/**
 * Unpacks a backup into staging paths. Only the database file and regular
 * files under `images/` are accepted; any other path or entry type (links,
 * devices, stray `data/*` files) rejects the whole archive.
 */
export async function extractBackupArchive(
  archive: string,
  { databaseName, databaseTarget, imagesTarget }: ExtractArchiveOptions,
) {
  const extract = tar.extract();
  const source = createReadStream(archive);
  const gunzip = createGunzip();
  source.on('error', (error) => extract.destroy(error));
  gunzip.on('error', (error) => extract.destroy(error));
  source.pipe(gunzip).pipe(extract);

  let hasDatabase = false;
  let imageCount = 0;

  try {
    for await (const entry of extract) {
      const { name, type } = entry.header;
      const segments = splitSafePath(name);

      if (!segments || (segments[0] !== 'data' && segments[0] !== 'images')) {
        throw new BackupArchiveError(`Unexpected path in archive: ${name}`);
      }

      if (type === 'directory') {
        if (segments[0] === 'data' && segments.length > 1) {
          throw new BackupArchiveError(`Unexpected path in archive: ${name}`);
        }

        entry.resume();
        continue;
      }

      if (type !== 'file' && type !== 'contiguous-file') {
        throw new BackupArchiveError(
          `Unsupported entry type "${type}" in archive: ${name}`,
        );
      }

      let target: string;

      if (segments[0] === 'data') {
        if (
          segments.length !== 2 ||
          segments[1] !== databaseName ||
          hasDatabase
        ) {
          throw new BackupArchiveError(`Unexpected path in archive: ${name}`);
        }

        hasDatabase = true;
        target = databaseTarget;
      } else {
        if (segments.length < 2 || segments[1] === RESTORE_STAGING_NAME) {
          throw new BackupArchiveError(`Unexpected path in archive: ${name}`);
        }

        imageCount += 1;
        target = join(imagesTarget, ...segments.slice(1));
      }

      await mkdir(dirname(target), { recursive: true });
      await pipeline(entry, createWriteStream(target, { flags: 'wx' }));
    }
  } catch (error) {
    source.destroy();
    throw error;
  }

  if (!hasDatabase) {
    throw new BackupArchiveError(
      `Archive does not contain data/${databaseName}`,
    );
  }

  return { imageCount };
}
