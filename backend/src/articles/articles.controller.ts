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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AdminApiGuard } from '../admin-api.guard';
import {
  DEFAULT_CONTENT_LOCALE,
  isSupportedContentLocale,
} from '../content-locales';
import {
  allowedImageMimeTypes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import {
  sanitizeArticleContent,
  sanitizeArticleExcerpt,
} from './article-content.util';
import { ArticlesService } from './articles.service';

const articlesImagesDirectory = join(process.cwd(), 'images', 'articles');
const articleContentImagesDirectory = join(articlesImagesDirectory, 'content');

type StoredUploadFile = StoredImageUploadFile;

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureArticlesDirectory() {
  mkdirSync(articlesImagesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Uploaded article image could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

function getStoredArticleImagePath(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  const fileName = basename(imageUrl);
  if (!fileName || fileName === '.' || fileName === 'articles') {
    return undefined;
  }

  return join(articlesImagesDirectory, fileName);
}

function normalizeFileNameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'article';
}

function getRequestTextField(req: Request, fieldName: string) {
  const body: unknown = req.body;

  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === 'string' ? value : undefined;
}

function parsePublishedAt(value?: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return new Date();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`);
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Published date is invalid');
  }

  return parsed;
}

function createImageInterceptor() {
  return FileInterceptor('image', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        ensureArticlesDirectory();
        callback(null, articlesImagesDirectory);
      },
      filename: (
        req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const title = getRequestTextField(req, 'title') ?? 'article';
        const extension = extname(file.originalname).toLowerCase() || '.jpg';
        const fileName = `${Date.now()}-${normalizeFileNameSegment(title)}${extension}`;
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
      fileSize: 5 * 1024 * 1024,
    },
  });
}

function createContentImageInterceptor() {
  return FileInterceptor('image', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        mkdirSync(articleContentImagesDirectory, { recursive: true });
        callback(null, articleContentImagesDirectory);
      },
      filename: (
        _req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const extension = extname(file.originalname).toLowerCase() || '.jpg';
        callback(null, `${Date.now()}-${randomUUID()}${extension}`);
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
      fileSize: 5 * 1024 * 1024,
    },
  });
}

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post('content-images')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createContentImageInterceptor())
  async uploadContentImage(@UploadedFile() file?: StoredUploadFile) {
    if (!file?.filename) {
      throw new BadRequestException('Article content image is required');
    }

    const imageFile = await optimizeUploadedImage(file);

    return {
      imageUrl: `articles/content/${imageFile.filename}`,
    };
  }

  @Get()
  findAll(
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.articlesService.findAll(locale, contentLocale);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.articlesService.findOne(id, locale, contentLocale);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImageInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFile()
    file?: StoredUploadFile,
  ) {
    const contentLocale = body.contentLocale?.trim().toLowerCase();
    const title = body.title?.trim() ?? '';
    const content = sanitizeArticleContent(body.content ?? '');
    const excerpt = sanitizeArticleExcerpt(body.excerpt?.trim() ?? '', content);

    if (!isSupportedContentLocale(contentLocale)) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Unsupported content locale');
    }

    if (contentLocale !== DEFAULT_CONTENT_LOCALE) {
      removeUploadedFile(file?.path);
      throw new BadRequestException(
        'Articles must be created in Russian first',
      );
    }

    if (!title) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Article title is required');
    }

    if (!content) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Article content is required');
    }

    if (!file?.filename) {
      throw new BadRequestException('Article image is required');
    }

    const imageFile = await optimizeUploadedImage(file);

    try {
      return await this.articlesService.create({
        contentLocale,
        title,
        excerpt,
        content,
        imageUrl: `articles/${imageFile.filename}`,
        publishedAt: parsePublishedAt(body.publishedAt),
      });
    } catch (error) {
      removeUploadedFile(imageFile.path);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImageInterceptor())
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile()
    file?: StoredUploadFile,
  ) {
    const contentLocale = body.contentLocale?.trim().toLowerCase();
    const title = body.title?.trim() ?? '';
    const content = sanitizeArticleContent(body.content ?? '');
    const excerpt = sanitizeArticleExcerpt(body.excerpt?.trim() ?? '', content);

    if (!isSupportedContentLocale(contentLocale)) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Unsupported content locale');
    }

    if (!title) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Article title is required');
    }

    if (!content) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Article content is required');
    }

    try {
      const imageFile = file?.filename
        ? await optimizeUploadedImage(file)
        : undefined;
      const currentArticle = await this.articlesService.findOne(id);
      const updatedArticle = await this.articlesService.update({
        id,
        contentLocale,
        title,
        excerpt,
        content,
        publishedAt: parsePublishedAt(body.publishedAt),
        imageUrl: imageFile?.filename
          ? `articles/${imageFile.filename}`
          : undefined,
      });

      if (imageFile?.filename) {
        removeUploadedFile(getStoredArticleImagePath(currentArticle.imageUrl));
      }

      return updatedArticle;
    } catch (error) {
      removeUploadedFile(file?.path);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AdminApiGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deletedArticle = await this.articlesService.remove(id);

    removeUploadedFile(getStoredArticleImagePath(deletedArticle.imageUrl));

    return { id: deletedArticle.id };
  }

  @Post(':id/views')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  incrementViewCount(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.incrementViewCount(id);
  }
}
