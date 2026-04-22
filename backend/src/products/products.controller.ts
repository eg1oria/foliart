import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';

const productsImagesDirectory = join(process.cwd(), 'images', 'products');
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function ensureProductsDirectory() {
  mkdirSync(productsImagesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  unlinkSync(filePath);
}

function normalizeFileNameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'product';
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    if (categoryId) {
      return this.productsService.findByCategory(+categoryId);
    }
    return this.productsService.findAll();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          ensureProductsDirectory();
          callback(null, productsImagesDirectory);
        },
        filename: (req, file, callback) => {
          const name =
            typeof req.body?.name === 'string' ? req.body.name : 'product';
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          const fileName = `${Date.now()}-${normalizeFileNameSegment(name)}${extension}`;
          callback(null, fileName);
        },
      }),
      fileFilter: (_req, file, callback) => {
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
    }),
  )
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFile()
    file?: {
      filename: string;
      path: string;
    },
  ) {
    const categoryId = Number.parseInt(body.categoryId ?? '', 10);
    const name = body.name?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const advantages = body.advantages?.trim() ?? '';

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

    try {
      return await this.productsService.create({
        categoryId,
        name,
        description,
        advantages,
        imageUrl: `products/${file.filename}`,
      });
    } catch (error) {
      removeUploadedFile(file.path);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
