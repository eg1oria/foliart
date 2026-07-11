import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createArticleMediaVariants } from './image-upload.util';

describe('article image variants', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(
      created.splice(0).map((id) =>
        fs.rm(join(process.cwd(), 'images', 'articles', 'media', id), {
          recursive: true,
          force: true,
        }),
      ),
    );
  });

  it('validates and creates a full-size WEBP plus a bounded preview', async () => {
    const id = randomUUID();
    created.push(id);
    const buffer = await sharp({
      create: { width: 900, height: 600, channels: 3, background: '#008000' },
    })
      .png()
      .toBuffer();
    const result = await createArticleMediaVariants(
      {
        buffer,
        mimetype: 'image/png',
        originalname: 'leaf.png',
        size: buffer.length,
      },
      id,
    );
    const main = await sharp(
      join(process.cwd(), 'images', result.storagePath),
    ).metadata();
    const preview = await sharp(
      join(process.cwd(), 'images', result.previewPath),
    ).metadata();
    expect(main.format).toBe('webp');
    expect(main.width).toBe(900);
    expect(preview.width).toBe(640);
  });

  it('rejects MIME spoofing and non-image data', async () => {
    const jpeg = await sharp({
      create: { width: 10, height: 10, channels: 3, background: '#fff' },
    })
      .jpeg()
      .toBuffer();
    await expect(
      createArticleMediaVariants(
        {
          buffer: jpeg,
          mimetype: 'image/png',
          originalname: 'fake.png',
          size: jpeg.length,
        },
        randomUUID(),
      ),
    ).rejects.toThrow('does not match');
    await expect(
      createArticleMediaVariants(
        {
          buffer: Buffer.from('not an image'),
          mimetype: 'image/png',
          originalname: 'bad.png',
          size: 12,
        },
        randomUUID(),
      ),
    ).rejects.toThrow('could not be decoded');
  });

  it('keeps GIF as GIF and creates a static WEBP preview', async () => {
    const id = randomUUID();
    created.push(id);
    const buffer = await sharp({
      create: { width: 20, height: 20, channels: 4, background: '#00ff00' },
    })
      .gif()
      .toBuffer();
    const result = await createArticleMediaVariants(
      {
        buffer,
        mimetype: 'image/gif',
        originalname: 'leaf.gif',
        size: buffer.length,
      },
      id,
    );
    expect(result.mimeType).toBe('image/gif');
    expect(
      (
        await sharp(
          join(process.cwd(), 'images', result.storagePath),
        ).metadata()
      ).format,
    ).toBe('gif');
    expect(
      (
        await sharp(
          join(process.cwd(), 'images', result.previewPath),
        ).metadata()
      ).format,
    ).toBe('webp');
  });
});
