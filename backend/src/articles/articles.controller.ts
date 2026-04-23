import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import {
  sanitizeArticleContent,
  sanitizeArticleExcerpt,
} from './article-content.util';
import { ArticlesService } from './articles.service';

const articlesImagesDirectory = join(process.cwd(), 'images', 'articles');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

type StoredUploadFile = {
  filename: string;
  mimetype: string;
  originalname: string;
  path: string;
};

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

  unlinkSync(filePath);
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
      if (!allowedMimeTypes.has(file.mimetype)) {
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

  @Get()
  findAll(@Query('locale') locale?: string) {
    return this.articlesService.findAll(locale);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
  ) {
    return this.articlesService.findOne(id, locale);
  }

  @Post()
  @UseInterceptors(createImageInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFile()
    file?: StoredUploadFile,
  ) {
    const title = body.title?.trim() ?? '';
    const titleEn = body.titleEn?.trim() ?? '';
    const content = sanitizeArticleContent(body.content ?? '');
    const contentEn = sanitizeArticleContent(body.contentEn ?? '');
    const excerpt = sanitizeArticleExcerpt(body.excerpt?.trim() ?? '', content);
    const excerptEn = sanitizeArticleExcerpt(
      body.excerptEn?.trim() ?? '',
      contentEn,
    );

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

    try {
      return await this.articlesService.create({
        title,
        titleEn,
        excerpt,
        excerptEn,
        content,
        contentEn,
        imageUrl: `articles/${file.filename}`,
        publishedAt: parsePublishedAt(body.publishedAt),
      });
    } catch (error) {
      removeUploadedFile(file?.path);
      throw error;
    }
  }

  @Patch(':id')
  @UseInterceptors(createImageInterceptor())
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile()
    file?: StoredUploadFile,
  ) {
    const title = body.title?.trim() ?? '';
    const titleEn = body.titleEn?.trim() ?? '';
    const content = sanitizeArticleContent(body.content ?? '');
    const contentEn = sanitizeArticleContent(body.contentEn ?? '');
    const excerpt = sanitizeArticleExcerpt(body.excerpt?.trim() ?? '', content);
    const excerptEn = sanitizeArticleExcerpt(
      body.excerptEn?.trim() ?? '',
      contentEn,
    );

    if (!title) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Article title is required');
    }

    if (!content) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Article content is required');
    }

    try {
      const currentArticle = await this.articlesService.findOne(id);
      const updatedArticle = await this.articlesService.update({
        id,
        title,
        titleEn,
        excerpt,
        excerptEn,
        content,
        contentEn,
        publishedAt: parsePublishedAt(body.publishedAt),
        imageUrl: file?.filename ? `articles/${file.filename}` : undefined,
      });

      if (file?.filename) {
        removeUploadedFile(getStoredArticleImagePath(currentArticle.imageUrl));
      }

      return updatedArticle;
    } catch (error) {
      removeUploadedFile(file?.path);
      throw error;
    }
  }

  @Post(':id/views')
  incrementViewCount(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.incrementViewCount(id);
  }
}
