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

  private getTranslation<
    T extends ProductTranslationFields & {
      nameEn: string;
      descriptionEn: string;
      advantagesEn: string;
      compositionEn: string;
      applicationEn: string;
      translations?: Array<
        ProductTranslationFields & {
          locale: string;
        }
      >;
    },
  >(product: T, locale: string) {
    const normalizedLocale = normalizeContentLocale(locale);
    const translation = product.translations?.find(
      (item) => item.locale === normalizedLocale,
    );

    if (translation) {
      return {
        ...translation,
        hasTranslation: true,
      };
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

  private resolveLocale<
    T extends ProductTranslationFields & {
      nameEn: string;
      descriptionEn: string;
      advantagesEn: string;
      compositionEn: string;
      applicationEn: string;
      translations?: Array<
        ProductTranslationFields & {
          locale: string;
        }
      >;
    },
  >(product: T, locale?: string, contentLocale?: string) {
    const fallback = this.getTranslation(product, DEFAULT_CONTENT_LOCALE);
    const selected = locale ? this.getTranslation(product, locale) : fallback;
    const adminLocale = contentLocale
      ? normalizeContentLocale(contentLocale)
      : null;
    const adminTranslation = adminLocale
      ? this.getTranslation(product, adminLocale)
      : null;
    const { translations: _translations, ...productFields } = product;

    return {
      ...productFields,
      name: locale && selected.name.trim() ? selected.name : product.name,
      description:
        locale && selected.description.trim()
          ? selected.description
          : locale
            ? fallback.description
            : product.description,
      advantages:
        locale && selected.advantages.trim()
          ? selected.advantages
          : locale
            ? fallback.advantages
            : product.advantages,
      composition:
        locale && selected.composition.trim()
          ? selected.composition
          : locale
            ? fallback.composition
            : product.composition,
      application:
        locale && selected.application.trim()
          ? selected.application
          : locale
            ? fallback.application
            : product.application,
      slugSourceName: product.name,
      ...(adminTranslation
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
    return {
      name: input.name,
      nameEn: isLegacyEnglishContentLocale(contentLocale) ? input.name : '',
      description: input.description,
      descriptionEn: isLegacyEnglishContentLocale(contentLocale)
        ? input.description
        : '',
      advantages: input.advantages,
      advantagesEn: isLegacyEnglishContentLocale(contentLocale)
        ? input.advantages
        : '',
      composition: input.composition,
      compositionEn: isLegacyEnglishContentLocale(contentLocale)
        ? input.composition
        : '',
      application: input.application,
      applicationEn: isLegacyEnglishContentLocale(contentLocale)
        ? input.application
        : '',
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
    const productCount = await this.prisma.product.count({
      where: { categoryId },
    });

    await this.prisma.category.update({
      where: { id: categoryId },
      data: { productCount },
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
    const existingProduct = await this.findOne(input.id);
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
