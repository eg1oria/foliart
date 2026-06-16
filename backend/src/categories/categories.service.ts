import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_CONTENT_LOCALE,
  isDefaultContentLocale,
  isLegacyEnglishContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';

const catalogCategoryLegacyImagePattern =
  /^\/?catalog-categories\/(1|4|5|6)\.(?:jpe?g|png|webp)$/i;

const catalogCategoryImageMap: Record<string, string> = {
  '1': 'category1',
  '5': 'category2',
  '6': 'category3',
  '4': 'category4',
};

type CategoryWithLegacyAndTranslations = {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  imageUrl: string;
  translations?: Array<{
    locale: string;
    name: string;
    description: string;
  }>;
};

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private resolveImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) return '';

    return imageUrl
      .trim()
      .replace(/\\/g, '/')
      .replace(
        catalogCategoryLegacyImagePattern,
        (_match, categoryId: string) =>
          `/catalog-categories/${catalogCategoryImageMap[categoryId]}.webp`,
      );
  }

  private getTranslation(
    category: CategoryWithLegacyAndTranslations,
    locale: string,
  ) {
    const normalizedLocale = normalizeContentLocale(locale);
    const translation = category.translations?.find(
      (item) => item.locale === normalizedLocale,
    );

    if (translation) {
      return {
        hasTranslation: true,
        name: translation.name,
        description: translation.description,
      };
    }

    if (isDefaultContentLocale(normalizedLocale)) {
      return {
        hasTranslation: false,
        name: category.name,
        description: category.description,
      };
    }

    if (isLegacyEnglishContentLocale(normalizedLocale)) {
      return {
        hasTranslation: false,
        name: category.nameEn,
        description: category.descriptionEn,
      };
    }

    return {
      hasTranslation: false,
      name: '',
      description: '',
    };
  }
  private resolveLocale<T extends CategoryWithLegacyAndTranslations>(
    category: T,
    locale?: string,
    contentLocale?: string,
  ) {
    const fallback = this.getTranslation(category, DEFAULT_CONTENT_LOCALE);
    const selected = locale ? this.getTranslation(category, locale) : fallback;

    const localizedName = selected.name.trim() ? selected.name : fallback.name;
    const localizedDescription = selected.description.trim()
      ? selected.description
      : fallback.description;

    const adminLocale = contentLocale
      ? normalizeContentLocale(contentLocale)
      : null;
    const adminTranslation = adminLocale
      ? this.getTranslation(category, adminLocale)
      : null;

    const { translations: _translations, ...categoryFields } = category;

    return {
      ...categoryFields,
      name: locale ? localizedName : category.name,
      description: locale ? localizedDescription : category.description,
      imageUrl: this.resolveImageUrl(category.imageUrl),
      slugSourceName: category.name,
      ...(adminTranslation && adminLocale
        ? {
            adminTranslation: {
              locale: adminLocale,
              hasTranslation: adminTranslation.hasTranslation,
              isComplete:
                Boolean(adminTranslation.name.trim()) &&
                Boolean(adminTranslation.description.trim()),
              name: adminTranslation.name,
              description: adminTranslation.description,
            },
          }
        : {}),
    };
  }

  async findAll(locale?: string, contentLocale?: string) {
    const categories = await this.prisma.category.findMany({
      include: { translations: true },
      orderBy: { id: 'asc' },
    });

    return categories.map((category) =>
      this.resolveLocale(category, locale, contentLocale),
    );
  }

  async findOne(id: number, locale?: string, contentLocale?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return this.resolveLocale(category, locale, contentLocale);
  }

  async updateTranslation(
    id: number,
    input: { locale: string; name: string; description: string },
  ) {
    const exists = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    const contentLocale = normalizeContentLocale(input.locale);

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(isDefaultContentLocale(contentLocale)
          ? { name: input.name, description: input.description }
          : {}),
        ...(isLegacyEnglishContentLocale(contentLocale)
          ? { nameEn: input.name, descriptionEn: input.description }
          : {}),
        translations: {
          upsert: {
            where: {
              categoryId_locale: {
                categoryId: id,
                locale: contentLocale,
              },
            },
            update: {
              name: input.name,
              description: input.description,
            },
            create: {
              locale: contentLocale,
              name: input.name,
              description: input.description,
            },
          },
        },
      },
    });
  }
}
