import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import sharp from 'sharp';

export const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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
    await sharp(file.path, { failOn: 'none' })
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
  } catch {
    await Promise.allSettled([
      fs.rm(tempPath, { force: true }),
      fs.rm(file.path, { force: true }),
    ]);

    throw new BadRequestException('Image could not be processed');
  }
}
