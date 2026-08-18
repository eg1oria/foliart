import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { AdminApiGuard } from '../admin-api.guard';
import {
  isSupportedContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { CategoriesService } from './categories.service';

const categoriesImagesDirectory = join(process.cwd(), 'images', 'categories');
const storedCategoryImagePrefix = 'categories/';

type StoredUploadFile = StoredImageUploadFile & { fieldname: string };

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureCategoriesDirectory() {
  mkdirSync(categoriesImagesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Uploaded category image could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

/**
 * Only images this API stored itself may be deleted: the seeded categories
 * still point at `/catalog-categories/*.webp`, which are shipped with the
 * frontend and must survive a replacement upload.
 */
function getStoredCategoryImagePath(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  const normalized = imageUrl.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith(storedCategoryImagePrefix)) {
    return undefined;
  }

  const fileName = basename(normalized);
  if (!fileName || fileName === '.' || fileName === 'categories') {
    return undefined;
  }

  return join(categoriesImagesDirectory, fileName);
}

function normalizeFileNameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'category';
}

function getRequestTextField(req: Request, fieldName: string) {
  const body: unknown = req.body;

  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === 'string' ? value : undefined;
}

function createImageInterceptor() {
  return FileInterceptor('image', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        ensureCategoriesDirectory();
        callback(null, categoriesImagesDirectory);
      },
      filename: (
        req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const name = getRequestTextField(req, 'name') ?? 'category';
        const extension = extname(file.originalname).toLowerCase() || '.jpg';
        const fileName = `${Date.now()}-${normalizeFileNameSegment(name)}${extension}`;
        callback(null, fileName);
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
    },
  });
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.categoriesService.findAll(locale, contentLocale);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.categoriesService.findOne(id, locale, contentLocale);
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImageInterceptor())
  async updateTranslations(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() image?: StoredUploadFile,
  ) {
    const localeInput =
      body.contentLocale ?? (body.nameEn || body.descriptionEn ? 'en' : 'ru');

    if (!isSupportedContentLocale(localeInput)) {
      removeUploadedFile(image?.path);
      throw new BadRequestException('Unsupported content locale');
    }

    const contentLocale = normalizeContentLocale(localeInput);

    try {
      const imageFile = image?.filename
        ? await optimizeUploadedImage(image)
        : undefined;
      const previousImageUrl = imageFile
        ? await this.categoriesService.getImageUrl(id)
        : undefined;

      const category = await this.categoriesService.updateTranslation(id, {
        locale: contentLocale,
        name: (body.name ?? body.nameEn)?.trim() ?? '',
        description: (body.description ?? body.descriptionEn)?.trim() ?? '',
        imageUrl: imageFile
          ? `${storedCategoryImagePrefix}${imageFile.filename}`
          : undefined,
      });

      if (imageFile) {
        removeUploadedFile(getStoredCategoryImagePath(previousImageUrl));
      }

      return category;
    } catch (error) {
      removeUploadedFile(image?.path);
      throw error;
    }
  }
}
