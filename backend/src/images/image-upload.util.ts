import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import sharp from 'sharp';

export const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const maxImageUploadBytes = 5 * 1024 * 1024;

export type MemoryImageUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export type StoredArticleMedia = {
  storagePath: string;
  previewPath: string;
  publicUrl: string;
  previewUrl: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  pages: number;
};

export type StoredImageUploadFile = {
  fieldname?: string;
  filename: string;
  mimetype: string;
  originalname: string;
  path: string;
};

type OptimizeImageOptions = {
  maxDimension?: number;
  quality?: number;
};

const defaultMaxDimension = 1920;
const defaultQuality = 82;

export async function optimizeUploadedImage<T extends StoredImageUploadFile>(
  file: T,
  options: OptimizeImageOptions = {},
): Promise<T> {
  const maxDimension = options.maxDimension ?? defaultMaxDimension;
  const quality = options.quality ?? defaultQuality;
  const directory = dirname(file.path);
  const baseName = basename(file.filename, extname(file.filename));
  const outputFilename = `${baseName}.webp`;
  const outputPath = join(directory, outputFilename);
  const tempPath = join(
    directory,
    `.${baseName}-${process.pid}-${Date.now()}.tmp.webp`,
  );

  try {
    const input =
      outputPath === file.path ? await fs.readFile(file.path) : file.path;

    await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 4,
        smartSubsample: true,
      })
      .toFile(tempPath);

    await fs.rm(outputPath, { force: true });
    await fs.rename(tempPath, outputPath);

    if (outputPath !== file.path) {
      await fs.rm(file.path, { force: true });
    }

    file.filename = outputFilename;
    file.path = outputPath;
    file.mimetype = 'image/webp';

    return file;
  } catch (error) {
    console.error('Image optimization failed', {
      message: error instanceof Error ? error.message : String(error),
      input: file.path,
      output: outputPath,
      temp: tempPath,
    });

    await Promise.allSettled([
      fs.rm(tempPath, { force: true }),
      fs.rm(file.path, { force: true }),
    ]);

    throw new BadRequestException('Image could not be processed');
  }
}

export async function createArticleMediaVariants(
  file: MemoryImageUploadFile,
  mediaId: string,
): Promise<StoredArticleMedia> {
  if (!allowedImageMimeTypes.has(file.mimetype)) {
    throw new BadRequestException(
      'Only JPG, PNG, WEBP, and GIF images are supported',
    );
  }
  if (!file.buffer.length || file.buffer.length > maxImageUploadBytes) {
    throw new BadRequestException('Image must be no larger than 5 MB');
  }

  const input = sharp(file.buffer, {
    animated: true,
    failOn: 'error',
    limitInputPixels: 40_000_000,
  });
  let metadata: Awaited<ReturnType<typeof input.metadata>>;
  try {
    metadata = await input.metadata();
  } catch {
    throw new BadRequestException('Image could not be decoded');
  }

  const format = metadata.format;
  const detectedMime =
    format === 'jpeg'
      ? 'image/jpeg'
      : format === 'png'
        ? 'image/png'
        : format === 'webp'
          ? 'image/webp'
          : format === 'gif'
            ? 'image/gif'
            : null;
  if (!detectedMime || detectedMime !== file.mimetype) {
    throw new BadRequestException(
      'Uploaded file type does not match its image data',
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.pageHeight ?? metadata.height ?? 0;
  const pages = metadata.pages ?? 1;
  if (!width || !height || width * height > 40_000_000) {
    throw new BadRequestException('Image dimensions are invalid or too large');
  }
  if (pages > 200 || width * height * pages > 80_000_000) {
    throw new BadRequestException(
      'Animated image contains too many pixels or frames',
    );
  }

  const relativeDirectory = join('articles', 'media', mediaId);
  const directory = join(process.cwd(), 'images', relativeDirectory);
  const isGif = format === 'gif';
  const originalName = `original.${isGif ? 'gif' : 'webp'}`;
  const previewName = 'preview.webp';
  const storagePath = join(relativeDirectory, originalName).replace(/\\/g, '/');
  const previewPath = join(relativeDirectory, previewName).replace(/\\/g, '/');
  const originalTemp = join(directory, `.${originalName}.tmp`);
  const previewTemp = join(directory, `.${previewName}.tmp`);
  const originalPath = join(directory, originalName);
  const finalPreviewPath = join(directory, previewName);

  await fs.mkdir(directory, { recursive: true });
  try {
    if (isGif) {
      await sharp(file.buffer, {
        animated: true,
        failOn: 'error',
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .gif({ effort: 3, reuse: true })
        .toFile(originalTemp);
    } else {
      await sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .webp({ quality: 82, effort: 4, smartSubsample: true })
        .toFile(originalTemp);
    }

    await sharp(file.buffer, {
      animated: false,
      failOn: 'error',
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({ width: 640, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(previewTemp);

    await fs.rename(originalTemp, originalPath);
    await fs.rename(previewTemp, finalPreviewPath);
    const stored = await fs.stat(originalPath);
    return {
      storagePath,
      previewPath,
      publicUrl: `/media/${storagePath}`,
      previewUrl: `/media/${previewPath}`,
      mimeType: isGif ? 'image/gif' : 'image/webp',
      byteSize: stored.size,
      width,
      height,
      pages,
    };
  } catch (error) {
    await fs.rm(directory, { force: true, recursive: true });
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('Image could not be processed');
  }
}
