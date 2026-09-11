import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';
import { AdminApiGuard } from '../admin-api.guard';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { parseSiteImageKey } from './site-images.validation';
import { SiteImagesService } from './site-images.service';

const siteImagesDirectory = join(process.cwd(), 'images', 'site');
const storedSiteImagePrefix = 'site/';
const minMaxDimension = 64;
const maxMaxDimension = 4096;
const defaultMaxDimension = 1920;

type StoredUploadFile = StoredImageUploadFile & { size: number };

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureSiteImagesDirectory() {
  mkdirSync(siteImagesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Uploaded site image could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

/**
 * Only files this API stored itself may be deleted. Every slot falls back to a
 * file in the frontend's `public/`, and those defaults must survive both a
 * replacement upload and a reset.
 */
function getStoredSiteImagePath(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  const normalized = imageUrl.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith(storedSiteImagePrefix)) {
    return undefined;
  }

  const fileName = basename(normalized);
  if (!fileName || fileName === '.' || fileName === 'site') {
    return undefined;
  }

  return join(siteImagesDirectory, fileName);
}

function createSiteImageInterceptor() {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        ensureSiteImagesDirectory();
        callback(null, siteImagesDirectory);
      },
      // A replacement never reuses the previous file name: `minimumCacheTTL`
      // in `frontend/next.config.ts` keeps an optimized image for a week, so
      // overwriting in place would leave visitors on the old photo until it
      // expires. The old file is unlinked once the new row is stored.
      filename: (
        req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const key = getRequestKey(req);
        const extension = extname(file.originalname).toLowerCase() || '.jpg';
        callback(null, `${Date.now()}-${key}${extension}`);
      },
    }),
    fileFilter: (
      _req: Request,
      file: StoredUploadFile,
      callback: FileFilterCallback,
    ) => {
      if (!allowedImageMimeTypes.has(file.mimetype)) {
        callback(
          new BadRequestException(
            'Only JPG, PNG, and WEBP images are supported',
          ),
          false,
        );
        return;
      }

      callback(null, true);
    },
    limits: {
      fileSize: maxImageUploadBytes,
      files: 1,
    },
  });
}

// The route handler rejects an unsupported key; this only has to keep a bad one
// out of the file name multer is about to write.
function getRequestKey(req: Request) {
  const value: unknown = req.params?.key;

  try {
    return parseSiteImageKey(typeof value === 'string' ? value : '');
  } catch {
    return 'site-image';
  }
}

function parseMaxDimension(value: unknown) {
  const parsed = Number.parseInt(typeof value === 'string' ? value : '', 10);

  if (
    !Number.isInteger(parsed) ||
    parsed < minMaxDimension ||
    parsed > maxMaxDimension
  ) {
    return defaultMaxDimension;
  }

  return parsed;
}

@Controller('site-images')
export class SiteImagesController {
  constructor(private readonly siteImages: SiteImagesService) {}

  @Get()
  findAll() {
    return this.siteImages.findAll();
  }

  @Put(':key')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createSiteImageInterceptor())
  async save(
    @Param('key') keyInput: string,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() file?: StoredUploadFile,
  ) {
    let key: string;

    try {
      key = parseSiteImageKey(keyInput);
    } catch (error) {
      removeUploadedFile(file?.path);
      throw error;
    }

    if (!file?.filename) {
      throw new BadRequestException('Image file is required');
    }

    try {
      if (file.size > maxImageUploadBytes) {
        throw new BadRequestException('Image must be no larger than 5 MB');
      }

      const optimized = await optimizeUploadedImage(file, {
        maxDimension: parseMaxDimension(body?.maxDimension),
      });
      const { width, height } = await readStoredDimensions(optimized.path);

      const previous = await this.siteImages.save(key, {
        imageUrl: `${storedSiteImagePrefix}${optimized.filename}`,
        width,
        height,
      });

      removeUploadedFile(getStoredSiteImagePath(previous?.imageUrl));

      return this.siteImages.findAll();
    } catch (error) {
      removeUploadedFile(file.path);
      throw error;
    }
  }

  @Delete(':key')
  @UseGuards(AdminApiGuard)
  async remove(@Param('key') keyInput: string) {
    const previous = await this.siteImages.reset(parseSiteImageKey(keyInput));

    removeUploadedFile(getStoredSiteImagePath(previous?.imageUrl));

    return this.siteImages.findAll();
  }
}

// The stored dimensions drive the `width`/`height` of slots that render without
// `fill`, so they are read back from the file sharp actually wrote rather than
// from the upload it was given.
async function readStoredDimensions(path: string) {
  try {
    const metadata = await sharp(path).metadata();

    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
  } catch (error) {
    console.warn('Site image dimensions could not be read', {
      message: error instanceof Error ? error.message : String(error),
      path,
    });
  }

  return { width: 0, height: 0 };
}
