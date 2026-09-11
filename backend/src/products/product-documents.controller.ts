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
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { mkdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { AdminApiGuard } from '../admin-api.guard';
import { isSupportedContentLocale } from '../content-locales';
import {
  decodeUploadedFileName,
  hasPdfFileSignature,
  isPdfUpload,
  maxDocumentPdfUploadBytes,
  removeUploadedFile,
} from '../documents/document-upload.util';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { ProductDocumentsService } from './product-documents.service';

const documentsDirectory = join(process.cwd(), 'images', 'product-documents');
export const storedProductDocumentPrefix = 'product-documents/';
export const maxProductDocumentTitleLength = 200;

type StoredUploadFile = StoredImageUploadFile & { size: number };

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureDocumentsDirectory() {
  mkdirSync(documentsDirectory, { recursive: true });
}

function discardUpload(filePath?: string) {
  removeUploadedFile(filePath, 'product document');
}

/**
 * Only files this API stored itself may be deleted, so a row that was pointed
 * at some other asset by hand never takes an unrelated file with it.
 */
export function getStoredProductDocumentPath(fileUrl?: string) {
  if (!fileUrl) {
    return undefined;
  }

  const normalized = fileUrl.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith(storedProductDocumentPrefix)) {
    return undefined;
  }

  const fileName = basename(normalized);
  if (!fileName || fileName === '.' || fileName === 'product-documents') {
    return undefined;
  }

  return join(documentsDirectory, fileName);
}

function createDocumentInterceptor() {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        ensureDocumentsDirectory();
        callback(null, documentsDirectory);
      },
      filename: (
        _req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const extension = isPdfUpload(file)
          ? '.pdf'
          : extname(file.originalname).toLowerCase() || '.jpg';
        callback(
          null,
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-document${extension}`,
        );
      },
    }),
    fileFilter: (
      _req: Request,
      file: StoredUploadFile,
      callback: FileFilterCallback,
    ) => {
      if (isPdfUpload(file) || allowedImageMimeTypes.has(file.mimetype)) {
        callback(null, true);
        return;
      }

      callback(
        new BadRequestException(
          'Only PDF files and JPG, PNG, or WEBP images are supported',
        ),
        false,
      );
    },
    limits: {
      fileSize: maxDocumentPdfUploadBytes,
      files: 1,
    },
  });
}

function parseTitle(value: string | undefined, fallback: string) {
  const title = value?.trim() ?? '';
  const resolved = title || fallback.replace(/\.[^.]+$/, '').trim();

  return resolved.slice(0, maxProductDocumentTitleLength);
}

@Controller('products/:productId/documents')
export class ProductDocumentsController {
  constructor(private readonly documentsService: ProductDocumentsService) {}

  @Get()
  findAll(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('contentLocale') contentLocale?: string,
  ) {
    if (contentLocale && !isSupportedContentLocale(contentLocale)) {
      throw new BadRequestException('Unsupported content locale');
    }

    return this.documentsService.findByProduct(productId, contentLocale);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createDocumentInterceptor())
  async create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() file?: StoredUploadFile,
  ) {
    const contentLocale = body.contentLocale?.trim().toLowerCase();

    if (!isSupportedContentLocale(contentLocale)) {
      discardUpload(file?.path);
      throw new BadRequestException('Unsupported content locale');
    }

    if (!file?.filename) {
      throw new BadRequestException('Document file is required');
    }

    try {
      const stored = isPdfUpload(file)
        ? this.storePdf(file)
        : await this.storeImage(file);

      const originalName = decodeUploadedFileName(file.originalname);

      return await this.documentsService.create({
        productId,
        locale: contentLocale,
        title: parseTitle(body.title, originalName),
        originalName: originalName.slice(0, 200),
        ...stored,
      });
    } catch (error) {
      discardUpload(file.path);
      throw error;
    }
  }

  @Patch(':documentId')
  @UseGuards(AdminApiGuard)
  async update(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() body: Record<string, string | undefined>,
  ) {
    const direction = body.move?.trim();

    if (direction) {
      if (direction !== 'up' && direction !== 'down') {
        throw new BadRequestException('Unsupported move direction');
      }

      return this.documentsService.move(productId, documentId, direction);
    }

    const current = await this.documentsService.findOne(productId, documentId);

    return this.documentsService.rename(
      productId,
      documentId,
      parseTitle(body.title, current.originalName),
    );
  }

  @Delete(':documentId')
  @UseGuards(AdminApiGuard)
  async remove(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    const removed = await this.documentsService.remove(productId, documentId);

    discardUpload(getStoredProductDocumentPath(removed.fileUrl));

    return { id: removed.id };
  }

  private storePdf(file: StoredUploadFile) {
    if (file.size > maxDocumentPdfUploadBytes) {
      throw new BadRequestException('PDF must be no larger than 20 MB');
    }

    if (!hasPdfFileSignature(file)) {
      throw new BadRequestException('PDF file could not be read');
    }

    return {
      fileUrl: `${storedProductDocumentPrefix}${file.filename}`,
      mimeType: 'application/pdf',
      byteSize: file.size,
    };
  }

  // Multer's limit covers the larger PDF ceiling, so an oversized image is
  // caught here instead.
  private async storeImage(file: StoredUploadFile) {
    if (file.size > maxImageUploadBytes) {
      throw new BadRequestException('Image must be no larger than 5 MB');
    }

    const optimized = await optimizeUploadedImage(file);

    return {
      fileUrl: `${storedProductDocumentPrefix}${optimized.filename}`,
      mimeType: optimized.mimetype,
      // The re-encoded WEBP is what is actually served, so the stored size is
      // read back rather than carried over from the original upload.
      byteSize: statSync(optimized.path).size,
    };
  }
}
