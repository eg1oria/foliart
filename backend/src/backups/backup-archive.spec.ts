import { createWriteStream } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import * as tar from 'tar-stream';
import {
  BackupArchiveError,
  extractBackupArchive,
  listImageFiles,
  writeBackupArchive,
} from './backup-archive';
import { sha256File } from './backups.service';

type RawEntry = { name: string; content?: string; type?: tar.Header['type'] };

async function writeRawArchive(target: string, entries: RawEntry[]) {
  const pack = tar.pack();
  const done = pipeline(pack, createGzip(), createWriteStream(target));

  for (const entry of entries) {
    await new Promise<void>((resolve, reject) => {
      pack.entry(
        {
          name: entry.name,
          type: entry.type ?? 'file',
          linkname: entry.type === 'symlink' ? '/etc/passwd' : undefined,
        },
        entry.type === 'file' || !entry.type ? (entry.content ?? 'x') : '',
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  pack.finalize();
  await done;
}

describe('backup archive', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'foliart-archive-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function extract(archive: string) {
    const target = join(root, 'out');
    await mkdir(target, { recursive: true });

    return extractBackupArchive(archive, {
      databaseName: 'prod.db',
      databaseTarget: join(target, 'db'),
      imagesTarget: join(target, 'images'),
    });
  }

  it('round-trips the database and every image', async () => {
    const images = join(root, 'images');
    await mkdir(join(images, 'products'), { recursive: true });
    await mkdir(join(images, '.restore', 'new'), { recursive: true });
    await writeFile(join(images, 'products', 'товар 1.webp'), 'image-1');
    await writeFile(join(images, 'hero.webp'), 'image-2');
    await writeFile(join(images, '.restore', 'new', 'skip.webp'), 'staged');
    await symlink('/etc/passwd', join(images, 'link.webp'));
    await writeFile(join(root, 'snapshot.db'), 'database');

    const archive = join(root, 'backup.tar.gz');
    const checksum = await writeBackupArchive({
      databaseName: 'prod.db',
      databaseSnapshot: join(root, 'snapshot.db'),
      imagesDir: images,
      target: archive,
    });

    expect(checksum).toBe(await sha256File(archive));
    expect(await listImageFiles(images)).toEqual([
      'hero.webp',
      'products/товар 1.webp',
    ]);
    await expect(extract(archive)).resolves.toEqual({ imageCount: 2 });
    expect(await readFile(join(root, 'out', 'db'), 'utf8')).toBe('database');
    expect(
      await readFile(
        join(root, 'out', 'images', 'products', 'товар 1.webp'),
        'utf8',
      ),
    ).toBe('image-1');
    expect(await readdir(join(root, 'out', 'images'))).not.toContain(
      'link.webp',
    );
  });

  it.each<[string, RawEntry[]]>([
    [
      'a parent-directory path',
      [{ name: 'data/prod.db' }, { name: 'images/../../evil' }],
    ],
    ['an absolute path', [{ name: 'data/prod.db' }, { name: '/images/evil' }]],
    [
      'an unknown top-level folder',
      [{ name: 'data/prod.db' }, { name: 'etc/passwd' }],
    ],
    [
      'a stray data file',
      [{ name: 'data/prod.db' }, { name: 'data/other.db' }],
    ],
    [
      'a symlink',
      [{ name: 'data/prod.db' }, { name: 'images/a', type: 'symlink' }],
    ],
    [
      'the staging folder',
      [{ name: 'data/prod.db' }, { name: 'images/.restore/x' }],
    ],
    ['a missing database', [{ name: 'images/a.webp' }]],
  ])('rejects %s', async (_label, entries) => {
    const archive = join(root, 'bad.tar.gz');
    await writeRawArchive(archive, entries);

    await expect(extract(archive)).rejects.toBeInstanceOf(BackupArchiveError);
  });

  it('fails on a file that is not a gzip archive', async () => {
    const archive = join(root, 'broken.tar.gz');
    await writeFile(archive, 'not an archive');

    await expect(extract(archive)).rejects.toThrow();
  });
});
