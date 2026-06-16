import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_CONTENT_LOCALE,
  isDefaultContentLocale,
  isLegacyEnglishContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';

type ArticleTranslationFields = {
  title: string;
  excerpt: string;
  content: string;
};

type ArticleWithLegacyAndTranslations = ArticleTranslationFields & {
  titleEn: string;
  excerptEn: string;
  contentEn: string;
  translations?: Array<ArticleTranslationFields & { locale: string }>;
};

type CreateArticleInput = ArticleTranslationFields & {
  contentLocale: string;
  imageUrl: string;
  publishedAt: Date;
};

type UpdateArticleInput = ArticleTranslationFields & {
  id: number;
  contentLocale: string;
  publishedAt: Date;
  imageUrl?: string;
};

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  private getTranslation(
    article: ArticleWithLegacyAndTranslations,
    locale: string,
  ) {
    const normalizedLocale = normalizeContentLocale(locale);
    const translation = article.translations?.find(
      (item) => item.locale === normalizedLocale,
    );

    if (translation) {
      return { ...translation, hasTranslation: true };
    }

    if (isDefaultContentLocale(normalizedLocale)) {
      return {
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        hasTranslation: false,
      };
    }

    if (isLegacyEnglishContentLocale(normalizedLocale)) {
      return {
        title: article.titleEn,
        excerpt: article.excerptEn,
        content: article.contentEn,
        hasTranslation: false,
      };
    }

    return {
      title: '',
      excerpt: '',
      content: '',
      hasTranslation: false,
    };
  }

  private resolveLocale<T extends ArticleWithLegacyAndTranslations>(
    article: T,
    locale?: string,
    contentLocale?: string,
  ) {
    const fallback = this.getTranslation(article, DEFAULT_CONTENT_LOCALE);
    const selected = locale ? this.getTranslation(article, locale) : fallback;

    const adminLocale = contentLocale
      ? normalizeContentLocale(contentLocale)
      : null;
    const adminTranslation = adminLocale
      ? this.getTranslation(article, adminLocale)
      : null;

    const { translations: _translations, ...articleFields } = article;

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
      ...articleFields,
      title: resolve(selected.title, fallback.title, article.title),
      excerpt: resolve(selected.excerpt, fallback.excerpt, article.excerpt),
      content: resolve(selected.content, fallback.content, article.content),
      slugSourceTitle: article.title,
      ...(adminTranslation && adminLocale
        ? {
            adminTranslation: {
              locale: adminLocale,
              hasTranslation: adminTranslation.hasTranslation,
              isComplete:
                Boolean(adminTranslation.title.trim()) &&
                Boolean(adminTranslation.content.trim()),
              title: adminTranslation.title,
              excerpt: adminTranslation.excerpt,
              content: adminTranslation.content,
            },
          }
        : {}),
    };
  }

  private getCreateLegacyFields(
    contentLocale: string,
    input: ArticleTranslationFields,
  ) {
    const isDefault = isDefaultContentLocale(contentLocale);
    const isLegacyEn = isLegacyEnglishContentLocale(contentLocale);

    return {
      title: isDefault ? input.title : '',
      titleEn: isLegacyEn ? input.title : '',
      excerpt: isDefault ? input.excerpt : '',
      excerptEn: isLegacyEn ? input.excerpt : '',
      content: isDefault ? input.content : '',
      contentEn: isLegacyEn ? input.content : '',
    };
  }

  private getUpdateLegacyFields(
    contentLocale: string,
    input: ArticleTranslationFields,
  ) {
    if (isDefaultContentLocale(contentLocale)) {
      return {
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
      };
    }

    if (isLegacyEnglishContentLocale(contentLocale)) {
      return {
        titleEn: input.title,
        excerptEn: input.excerpt,
        contentEn: input.content,
      };
    }
    return {};
  }

  async findAll(locale?: string, contentLocale?: string) {
    const articles = await this.prisma.article.findMany({
      include: { translations: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });

    return articles.map((article) =>
      this.resolveLocale(article, locale, contentLocale),
    );
  }

  async findOne(id: number, locale?: string, contentLocale?: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    return this.resolveLocale(article, locale, contentLocale);
  }

  async create(input: CreateArticleInput) {
    const contentLocale = normalizeContentLocale(input.contentLocale);

    return this.prisma.article.create({
      data: {
        ...this.getCreateLegacyFields(contentLocale, input),
        imageUrl: input.imageUrl,
        publishedAt: input.publishedAt,
        translations: {
          create: {
            locale: contentLocale,
            title: input.title,
            excerpt: input.excerpt,
            content: input.content,
          },
        },
      },
    });
  }

  async update(input: UpdateArticleInput) {
    const exists = await this.prisma.article.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Article #${input.id} not found`);
    }

    const contentLocale = normalizeContentLocale(input.contentLocale);

    return this.prisma.article.update({
      where: { id: input.id },
      data: {
        ...this.getUpdateLegacyFields(contentLocale, input),
        publishedAt: input.publishedAt,
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        translations: {
          upsert: {
            where: {
              articleId_locale: {
                articleId: input.id,
                locale: contentLocale,
              },
            },
            update: {
              title: input.title,
              excerpt: input.excerpt,
              content: input.content,
            },
            create: {
              locale: contentLocale,
              title: input.title,
              excerpt: input.excerpt,
              content: input.content,
            },
          },
        },
      },
    });
  }

  async incrementViewCount(id: number) {
    const exists = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        viewCount: true,
      },
    });
  }
}
