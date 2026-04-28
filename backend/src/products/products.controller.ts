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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AdminApiGuard } from '../admin-api.guard';
import {
  allowedImageMimeTypes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { ProductsService } from './products.service';

const productsImagesDirectory = join(process.cwd(), 'images', 'products');

type StoredUploadFile = StoredImageUploadFile;

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureProductsDirectory() {
  mkdirSync(productsImagesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  unlinkSync(filePath);
}

function getStoredProductImagePath(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  const fileName = basename(imageUrl);
  if (!fileName || fileName === '.' || fileName === 'products') {
    return undefined;
  }

  return join(productsImagesDirectory, fileName);
}

function normalizeFileNameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'product';
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
        ensureProductsDirectory();
        callback(null, productsImagesDirectory);
      },
      filename: (
        req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const name = getRequestTextField(req, 'name') ?? 'product';
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
      fileSize: 5 * 1024 * 1024,
    },
  });
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('locale') locale?: string,
  ) {
    if (categoryId) {
      return this.productsService.findByCategory(+categoryId, locale);
    }
    return this.productsService.findAll(locale);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImageInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFile()
    file?: StoredUploadFile,
  ) {
    const categoryId = Number.parseInt(body.categoryId ?? '', 10);
    const name = body.name?.trim() ?? '';
    const nameEn = body.nameEn?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const descriptionEn = body.descriptionEn?.trim() ?? '';
    const advantages = body.advantages?.trim() ?? '';
    const advantagesEn = body.advantagesEn?.trim() ?? '';
    const composition = body.composition?.trim() ?? '';
    const compositionEn = body.compositionEn?.trim() ?? '';
    const application = body.application?.trim() ?? '';
    const applicationEn = body.applicationEn?.trim() ?? '';

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Category is required');
    }

    if (!name) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Product name is required');
    }

    if (!file?.filename) {
      throw new BadRequestException('Product image is required');
    }

    const imageFile = await optimizeUploadedImage(file);

    try {
      return await this.productsService.create({
        categoryId,
        name,
        nameEn,
        description,
        descriptionEn,
        advantages,
        advantagesEn,
        composition,
        compositionEn,
        application,
        applicationEn,
        imageUrl: `products/${imageFile.filename}`,
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
    const categoryId = Number.parseInt(body.categoryId ?? '', 10);
    const name = body.name?.trim() ?? '';
    const nameEn = body.nameEn?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const descriptionEn = body.descriptionEn?.trim() ?? '';
    const advantages = body.advantages?.trim() ?? '';
    const advantagesEn = body.advantagesEn?.trim() ?? '';
    const composition = body.composition?.trim() ?? '';
    const compositionEn = body.compositionEn?.trim() ?? '';
    const application = body.application?.trim() ?? '';
    const applicationEn = body.applicationEn?.trim() ?? '';

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Category is required');
    }

    if (!name) {
      removeUploadedFile(file?.path);
      throw new BadRequestException('Product name is required');
    }

    try {
      const imageFile = file?.filename
        ? await optimizeUploadedImage(file)
        : undefined;
      const currentProduct = await this.productsService.findOne(id);
      const updatedProduct = await this.productsService.update({
        id,
        categoryId,
        name,
        nameEn,
        description,
        descriptionEn,
        advantages,
        advantagesEn,
        composition,
        compositionEn,
        application,
        applicationEn,
        imageUrl: imageFile?.filename
          ? `products/${imageFile.filename}`
          : undefined,
      });

      if (imageFile?.filename) {
        removeUploadedFile(getStoredProductImagePath(currentProduct.imageUrl));
      }

      return updatedProduct;
    } catch (error) {
      removeUploadedFile(file?.path);
      throw error;
    }
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
  ) {
    return this.productsService.findOne(id, locale);
  }
}
