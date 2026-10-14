import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, NoFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';
import { AdminApiGuard } from '../admin-api.guard';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { SitePagesService } from './site-pages.service';
import {
  MAX_SITE_PAGE_HTML_BYTES,
  parseSitePageLocale,
  parseSitePageSettingsBody,
  parseSitePageSlug,
  parseSitePageTranslationBody,
} from './site-pages.validation';

const sitePagesImagesDirectory = join(process.cwd(), 'images', 'site-pages');
const storedSitePageImagePrefix = 'site-pages/';
/** Landing images are often full-width banners, so they keep more pixels. */
const sitePageImageMaxDimension = 2560;

type StoredUploadFile = StoredImageUploadFile & { size: number };

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Site page image could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

/** Only files this API stored under `site-pages/` may be deleted. */
function getStoredSitePageImagePath(imageUrl?: string) {
  const normalized = (imageUrl ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!normalized.startsWith(storedSitePageImagePrefix)) {
    return undefined;
  }

  const fileName = basename(normalized);
  if (!fileName || fileName === '.' || fileName === 'site-pages') {
    return undefined;
  }

  return join(sitePagesImagesDirectory, fileName);
}

function getRequestPageId(req: Request) {
  const value: unknown = req.params?.id;
  return typeof value === 'string' && /^\d+$/.test(value) ? value : 'page';
}

function createImageInterceptor() {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        mkdirSync(sitePagesImagesDirectory, { recursive: true });
        callback(null, sitePagesImagesDirectory);
      },
      filename: (
        req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const extension = extname(file.originalname).toLowerCase() || '.jpg';
        const random = Math.random().toString(36).slice(2, 8);
        callback(
          null,
          `${Date.now()}-${random}-page-${getRequestPageId(req)}${extension}`,
        );
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

// Read back from the file sharp actually wrote: the admin shows the stored
// size and dimensions, and the `<img>` snippet it copies carries them.
async function readStoredImage(path: string) {
  try {
    const metadata = await sharp(path).metadata();

    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      byteSize: statSync(path).size,
    };
  } catch {
    return { width: 0, height: 0, byteSize: 0 };
  }
}

@Controller('site-pages')
export class SitePagesController {
  constructor(private readonly sitePages: SitePagesService) {}

  @Get('public')
  findAllPublished() {
    return this.sitePages.findAllPublished();
  }

  @Get('public/:slug')
  findPublished(
    @Param('slug') slugInput: string,
    @Query('locale') localeInput?: string,
  ) {
    return this.sitePages.findPublished(
      parseSitePageSlug(slugInput),
      parseSitePageLocale(localeInput),
    );
  }

  @Get()
  @UseGuards(AdminApiGuard)
  findAll() {
    return this.sitePages.findAll();
  }

  @Get(':id')
  @UseGuards(AdminApiGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sitePages.findOne(id);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(NoFilesInterceptor())
  create(@Body() body: unknown) {
    return this.sitePages.create(parseSitePageSettingsBody(body));
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(NoFilesInterceptor())
  updateSettings(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.sitePages.updateSettings(id, parseSitePageSettingsBody(body));
  }

  // Multipart rather than JSON: the global JSON parser stops at 256 KB, and a
  // landing page with inline styles and scripts easily outgrows that.
  @Put(':id/translations/:locale')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(
    NoFilesInterceptor({
      limits: { fieldSize: MAX_SITE_PAGE_HTML_BYTES + 64 * 1024, fields: 10 },
    }),
  )
  saveTranslation(
    @Param('id', ParseIntPipe) id: number,
    @Param('locale') localeInput: string,
    @Body() body: unknown,
  ) {
    return this.sitePages.saveTranslation(
      id,
      parseSitePageLocale(localeInput),
      parseSitePageTranslationBody(body),
    );
  }

  @Delete(':id')
  @UseGuards(AdminApiGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.sitePages.remove(id);

    for (const image of deleted.images) {
      removeUploadedFile(getStoredSitePageImagePath(image.imageUrl));
    }

    return { id: deleted.id, slug: deleted.slug };
  }

  @Post(':id/images')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImageInterceptor())
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: StoredUploadFile,
  ) {
    if (!file?.filename) {
      throw new BadRequestException('Image file is required');
    }

    try {
      const originalName = file.originalname;
      const optimized = await optimizeUploadedImage(file, {
        maxDimension: sitePageImageMaxDimension,
      });
      const stored = await readStoredImage(optimized.path);

      return await this.sitePages.addImage(id, {
        imageUrl: `${storedSitePageImagePrefix}${optimized.filename}`,
        originalName: originalName.slice(0, 200),
        ...stored,
      });
    } catch (error) {
      removeUploadedFile(file.path);
      throw error;
    }
  }

  @Delete(':id/images/:imageId')
  @UseGuards(AdminApiGuard)
  async removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    const image = await this.sitePages.removeImage(id, imageId);

    removeUploadedFile(getStoredSitePageImagePath(image.imageUrl));

    return { id: image.id };
  }
}
