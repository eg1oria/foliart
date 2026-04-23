import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateProductInput = {
  categoryId: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  advantages: string;
  advantagesEn: string;
  composition: string;
  compositionEn: string;
  application: string;
  applicationEn: string;
  imageUrl: string;
};

type UpdateProductInput = {
  id: number;
  categoryId: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  advantages: string;
  advantagesEn: string;
  composition: string;
  compositionEn: string;
  application: string;
  applicationEn: string;
  imageUrl?: string;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private resolveLocale<
    T extends {
      name: string;
      nameEn: string;
      description: string;
      descriptionEn: string;
      advantages: string;
      advantagesEn: string;
      composition: string;
      compositionEn: string;
      application: string;
      applicationEn: string;
    },
  >(product: T, locale?: string) {
    const useEnglish = locale === 'en';

    return {
      ...product,
      name: useEnglish && product.nameEn.trim() ? product.nameEn : product.name,
      description:
        useEnglish && product.descriptionEn.trim()
          ? product.descriptionEn
          : product.description,
      advantages:
        useEnglish && product.advantagesEn.trim()
          ? product.advantagesEn
          : product.advantages,
      composition:
        useEnglish && product.compositionEn.trim()
          ? product.compositionEn
          : product.composition,
      application:
        useEnglish && product.applicationEn.trim()
          ? product.applicationEn
          : product.application,
      slugSourceName: product.name,
    };
  }

  private async syncCategoryProductCount(categoryId: number) {
    const productCount = await this.prisma.product.count({
      where: { categoryId },
    });

    await this.prisma.category.update({
      where: { id: categoryId },
      data: { productCount },
    });
  }

  async findAll(locale?: string) {
    const products = await this.prisma.product.findMany({
      orderBy: { id: 'asc' },
    });

    return products.map((product) => this.resolveLocale(product, locale));
  }

  async findByCategory(categoryId: number, locale?: string) {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      orderBy: { id: 'asc' },
    });

    return products.map((product) => this.resolveLocale(product, locale));
  }

  async findOne(id: number, locale?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return this.resolveLocale(product, locale);
  }

  async create(input: CreateProductInput) {
    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category #${input.categoryId} not found`);
    }

    const product = await this.prisma.product.create({
      data: {
        categoryId: input.categoryId,
        name: input.name,
        nameEn: input.nameEn,
        description: input.description,
        descriptionEn: input.descriptionEn,
        advantages: input.advantages,
        advantagesEn: input.advantagesEn,
        composition: input.composition,
        compositionEn: input.compositionEn,
        application: input.application,
        applicationEn: input.applicationEn,
        imageUrl: input.imageUrl,
      },
    });

    await this.syncCategoryProductCount(input.categoryId);

    return product;
  }

  async update(input: UpdateProductInput) {
    const existingProduct = await this.findOne(input.id);
    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category #${input.categoryId} not found`);
    }

    const product = await this.prisma.product.update({
      where: { id: input.id },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        nameEn: input.nameEn,
        description: input.description,
        descriptionEn: input.descriptionEn,
        advantages: input.advantages,
        advantagesEn: input.advantagesEn,
        composition: input.composition,
        compositionEn: input.compositionEn,
        application: input.application,
        applicationEn: input.applicationEn,
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      },
    });

    if (existingProduct.categoryId !== input.categoryId) {
      await Promise.all([
        this.syncCategoryProductCount(existingProduct.categoryId),
        this.syncCategoryProductCount(input.categoryId),
      ]);
    }

    return product;
  }
}
