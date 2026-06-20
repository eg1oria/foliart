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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
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
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

const productsImagesDirectory = join(process.cwd(), 'images', 'products');

const productImageFields = ['image', 'imageEn'] as const;
type ProductImageField = (typeof productImageFields)[number];
type StoredUploadFile = StoredImageUploadFile & { fieldname: string };
type UploadedProductFiles = Partial<
  Record<ProductImageField, StoredUploadFile[]>
>;

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

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Uploaded product image could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

function removeUploadedFiles(filePaths: Array<string | undefined>) {
  for (const filePath of filePaths) {
    removeUploadedFile(filePath);
  }
}

function getStoredProductImagePath(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  const fileName = basename(imageUrl);
  if (!fileName || fileName === '.' || fileName === 'products') {
    return undefined;
  }

  const resolvedPath = join(productsImagesDirectory, fileName);

  if (
    !resolvedPath.startsWith(productsImagesDirectory + '/') &&
    resolvedPath !== productsImagesDirectory
  ) {
    console.warn('Potential path traversal attempt blocked', { imageUrl });
    return undefined;
  }

  return resolvedPath;
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

function parseProductBody(body: Record<string, string | undefined>) {
  return {
    contentLocale: body.contentLocale?.trim().toLowerCase(),
    categoryId: Number.parseInt(body.categoryId ?? '', 10),
    name: body.name?.trim() ?? '',
    description: body.description?.trim() ?? '',
    advantages: body.advantages?.trim() ?? '',
    composition: body.composition?.trim() ?? '',
    application: body.application?.trim() ?? '',
  };
}

function getUploadedFile(
  files: UploadedProductFiles | undefined,
  fieldName: ProductImageField,
) {
  return files?.[fieldName]?.[0];
}

function createImagesInterceptor() {
  return FileFieldsInterceptor(
    productImageFields.map((name) => ({ name, maxCount: 1 })),
    {
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
          const localeSuffix =
            file.fieldname === 'imageEn' ? '-international' : '-ru';
          const fileName = `${Date.now()}-${normalizeFileNameSegment(name)}${localeSuffix}${extension}`;
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
    },
  );
}

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    if (categoryId !== undefined) {
      const parsedCategoryId = Number.parseInt(categoryId, 10);

      if (!Number.isInteger(parsedCategoryId) || parsedCategoryId < 1) {
        throw new BadRequestException('Invalid categoryId');
      }

      return this.productsService.findByCategory(
        parsedCategoryId,
        locale,
        contentLocale,
      );
    }

    return this.productsService.findAll(locale, contentLocale);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImagesInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files?: UploadedProductFiles,
  ) {
    const image = getUploadedFile(files, 'image');
    const imageEn = getUploadedFile(files, 'imageEn');
    const uploadedFiles = [image, imageEn];
    const {
      contentLocale,
      categoryId,
      name,
      description,
      advantages,
      composition,
      application,
    } = parseProductBody(body);

    if (!isSupportedContentLocale(contentLocale)) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Unsupported content locale');
    }

    if (contentLocale !== DEFAULT_CONTENT_LOCALE) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException(
        'Products must be created in Russian first',
      );
    }

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Category is required');
    }

    if (!name) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Product name is required');
    }

    if (!image?.filename) {
      removeUploadedFile(imageEn?.path);
      throw new BadRequestException('Product image is required');
    }

    try {
      const [imageFile, imageFileEn] = await Promise.all([
        optimizeUploadedImage(image),
        imageEn ? optimizeUploadedImage(imageEn) : Promise.resolve(undefined),
      ]);

      return await this.productsService.create({
        categoryId,
        contentLocale,
        name,
        description,
        advantages,
        composition,
        application,
        imageUrl: `products/${imageFile.filename}`,
        imageUrlEn: imageFileEn?.filename
          ? `products/${imageFileEn.filename}`
          : undefined,
      });
    } catch (error) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createImagesInterceptor())
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files?: UploadedProductFiles,
  ) {
    const image = getUploadedFile(files, 'image');
    const imageEn = getUploadedFile(files, 'imageEn');
    const uploadedFiles = [image, imageEn];
    const {
      contentLocale,
      categoryId,
      name,
      description,
      advantages,
      composition,
      application,
    } = parseProductBody(body);

    if (!isSupportedContentLocale(contentLocale)) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Unsupported content locale');
    }

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Category is required');
    }

    if (!name) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Product name is required');
    }

    try {
      const [imageFile, imageFileEn] = await Promise.all([
        image?.filename
          ? optimizeUploadedImage(image)
          : Promise.resolve(undefined),
        imageEn?.filename
          ? optimizeUploadedImage(imageEn)
          : Promise.resolve(undefined),
      ]);

      const currentProduct = await this.prisma.product.findUnique({
        where: { id },
        select: { imageUrl: true, imageUrlEn: true },
      });

      const updatedProduct = await this.productsService.update({
        id,
        categoryId,
        contentLocale,
        name,
        description,
        advantages,
        composition,
        application,
        imageUrl: imageFile?.filename
          ? `products/${imageFile.filename}`
          : undefined,
        imageUrlEn: imageFileEn?.filename
          ? `products/${imageFileEn.filename}`
          : undefined,
      });

      removeUploadedFiles([
        imageFile?.filename
          ? getStoredProductImagePath(currentProduct?.imageUrl)
          : undefined,
        imageFileEn?.filename
          ? getStoredProductImagePath(currentProduct?.imageUrlEn)
          : undefined,
      ]);

      return updatedProduct;
    } catch (error) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw error;
    }
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.productsService.findOne(id, locale, contentLocale);
  }
}
