import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_CONTENT_LOCALE,
  isDefaultContentLocale,
  isLegacyEnglishContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';

type ProductTranslationFields = {
  name: string;
  description: string;
  advantages: string;
  composition: string;
  application: string;
};

type ProductWithLegacyAndTranslations = ProductTranslationFields & {
  nameEn: string;
  descriptionEn: string;
  advantagesEn: string;
  compositionEn: string;
  applicationEn: string;
  translations?: Array<ProductTranslationFields & { locale: string }>;
};

type CreateProductInput = ProductTranslationFields & {
  categoryId: number;
  contentLocale: string;
  imageUrl: string;
};

type UpdateProductInput = ProductTranslationFields & {
  id: number;
  categoryId: number;
  contentLocale: string;
  imageUrl?: string;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private getTranslation(
    product: ProductWithLegacyAndTranslations,
    locale: string,
  ) {
    const normalizedLocale = normalizeContentLocale(locale);
    const translation = product.translations?.find(
      (item) => item.locale === normalizedLocale,
    );

    if (translation) {
      return { ...translation, hasTranslation: true };
    }

    if (isDefaultContentLocale(normalizedLocale)) {
      return {
        name: product.name,
        description: product.description,
        advantages: product.advantages,
        composition: product.composition,
        application: product.application,
        hasTranslation: false,
      };
    }

    if (isLegacyEnglishContentLocale(normalizedLocale)) {
      return {
        name: product.nameEn,
        description: product.descriptionEn,
        advantages: product.advantagesEn,
        composition: product.compositionEn,
        application: product.applicationEn,
        hasTranslation: false,
      };
    }

    return {
      name: '',
      description: '',
      advantages: '',
      composition: '',
      application: '',
      hasTranslation: false,
    };
  }
  private resolveLocale<T extends ProductWithLegacyAndTranslations>(
    product: T,
    locale?: string,
    contentLocale?: string,
  ) {
    const fallback = this.getTranslation(product, DEFAULT_CONTENT_LOCALE);
    const selected = locale ? this.getTranslation(product, locale) : fallback;
    const adminLocale = contentLocale
      ? normalizeContentLocale(contentLocale)
      : null;
    const adminTranslation = adminLocale
      ? this.getTranslation(product, adminLocale)
      : null;

    const { translations: _translations, ...productFields } = product;
    const resolve = (
      selectedValue: string,
      fallbackValue: string,
      originalValue: string,
    ): string => {
      if (locale && selectedValue.trim()) return selectedValue;
      if (locale) return fallbackValue;
      return originalValue;
    };

    return {
      ...productFields,
      name: resolve(selected.name, fallback.name, product.name),
      description: resolve(
        selected.description,
        fallback.description,
        product.description,
      ),
      advantages: resolve(
        selected.advantages,
        fallback.advantages,
        product.advantages,
      ),
      composition: resolve(
        selected.composition,
        fallback.composition,
        product.composition,
      ),
      application: resolve(
        selected.application,
        fallback.application,
        product.application,
      ),
      slugSourceName: product.name,
      ...(adminTranslation && adminLocale
        ? {
            adminTranslation: {
              locale: adminLocale,
              hasTranslation: adminTranslation.hasTranslation,
              isComplete: Boolean(adminTranslation.name.trim()),
              name: adminTranslation.name,
              description: adminTranslation.description,
              advantages: adminTranslation.advantages,
              composition: adminTranslation.composition,
              application: adminTranslation.application,
            },
          }
        : {}),
    };
  }

  private getCreateLegacyFields(
    contentLocale: string,
    input: ProductTranslationFields,
  ) {
    const isLegacyEn = isLegacyEnglishContentLocale(contentLocale);

    return {
      name: isDefaultContentLocale(contentLocale) ? input.name : '',
      nameEn: isLegacyEn ? input.name : '',
      description: isDefaultContentLocale(contentLocale)
        ? input.description
        : '',
      descriptionEn: isLegacyEn ? input.description : '',
      advantages: isDefaultContentLocale(contentLocale) ? input.advantages : '',
      advantagesEn: isLegacyEn ? input.advantages : '',
      composition: isDefaultContentLocale(contentLocale)
        ? input.composition
        : '',
      compositionEn: isLegacyEn ? input.composition : '',
      application: isDefaultContentLocale(contentLocale)
        ? input.application
        : '',
      applicationEn: isLegacyEn ? input.application : '',
    };
  }

  private getUpdateLegacyFields(
    contentLocale: string,
    input: ProductTranslationFields,
  ) {
    if (isDefaultContentLocale(contentLocale)) {
      return {
        name: input.name,
        description: input.description,
        advantages: input.advantages,
        composition: input.composition,
        application: input.application,
      };
    }

    if (isLegacyEnglishContentLocale(contentLocale)) {
      return {
        nameEn: input.name,
        descriptionEn: input.description,
        advantagesEn: input.advantages,
        compositionEn: input.composition,
        applicationEn: input.application,
      };
    }
    return {};
  }

  private async syncCategoryProductCount(categoryId: number) {
    await this.prisma.$transaction(async (tx) => {
      const productCount = await tx.product.count({
        where: { categoryId },
      });

      await tx.category.update({
        where: { id: categoryId },
        data: { productCount },
      });
    });
  }

  async findAll(locale?: string, contentLocale?: string) {
    const products = await this.prisma.product.findMany({
      include: { translations: true },
      orderBy: { id: 'asc' },
    });

    return products.map((product) =>
      this.resolveLocale(product, locale, contentLocale),
    );
  }

  async findByCategory(
    categoryId: number,
    locale?: string,
    contentLocale?: string,
  ) {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      include: { translations: true },
      orderBy: { id: 'asc' },
    });

    return products.map((product) =>
      this.resolveLocale(product, locale, contentLocale),
    );
  }

  async findOne(id: number, locale?: string, contentLocale?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return this.resolveLocale(product, locale, contentLocale);
  }

  async create(input: CreateProductInput) {
    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category #${input.categoryId} not found`);
    }

    const contentLocale = normalizeContentLocale(input.contentLocale);

    const product = await this.prisma.product.create({
      data: {
        categoryId: input.categoryId,
        ...this.getCreateLegacyFields(contentLocale, input),
        imageUrl: input.imageUrl,
        translations: {
          create: {
            locale: contentLocale,
            name: input.name,
            description: input.description,
            advantages: input.advantages,
            composition: input.composition,
            application: input.application,
          },
        },
      },
    });

    await this.syncCategoryProductCount(input.categoryId);

    return product;
  }

  async update(input: UpdateProductInput) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: input.id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product #${input.id} not found`);
    }

    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category #${input.categoryId} not found`);
    }

    const contentLocale = normalizeContentLocale(input.contentLocale);

    const product = await this.prisma.product.update({
      where: { id: input.id },
      data: {
        categoryId: input.categoryId,
        ...this.getUpdateLegacyFields(contentLocale, input),
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        translations: {
          upsert: {
            where: {
              productId_locale: {
                productId: input.id,
                locale: contentLocale,
              },
            },
            update: {
              name: input.name,
              description: input.description,
              advantages: input.advantages,
              composition: input.composition,
              application: input.application,
            },
            create: {
              locale: contentLocale,
              name: input.name,
              description: input.description,
              advantages: input.advantages,
              composition: input.composition,
              application: input.application,
            },
          },
        },
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
