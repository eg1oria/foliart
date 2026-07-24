import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_CONTENT_LOCALE,
  isDefaultContentLocale,
  isLegacyEnglishContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';
import { slugifyArticleTitle } from './article-slug.util';
import {
  applyArticleImageLayout,
  createArticleImageLayout,
  normalizeArticleImageLayout,
} from './article-image-layout';
import { normalizeArticleDocument } from './article-content-json';
import { sanitizeArticleContent } from './article-content.util';

type ArticleTranslationFields = {
  title: string;
  excerpt: string;
  content: string;
  contentJson?: unknown;
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
        contentJson: undefined,
        hasTranslation: false,
      };
    }

    if (isLegacyEnglishContentLocale(normalizedLocale)) {
      return {
        title: article.titleEn,
        excerpt: article.excerptEn,
        content: article.contentEn,
        contentJson: undefined,
        hasTranslation: false,
      };
    }

    return {
      title: '',
      excerpt: '',
      content: '',
      contentJson: undefined,
      hasTranslation: false,
    };
  }

  private hasCompleteTranslation(
    article: ArticleWithLegacyAndTranslations,
    locale: string,
  ) {
    const translation = this.getTranslation(article, locale);

    return (
      Boolean(translation.title.trim()) &&
      (Boolean(translation.content.trim()) || Boolean(translation.contentJson))
    );
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
              isComplete: this.hasCompleteTranslation(article, adminLocale),
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

    const visibleArticles =
      locale && !contentLocale
        ? articles.filter((article) =>
            this.hasCompleteTranslation(article, locale),
          )
        : articles;

    return visibleArticles.map((article) => {
      const resolved = this.resolveLocale(article, locale, contentLocale);
      const {
        content: _content,
        contentEn: _contentEn,
        adminTranslation,
        ...summary
      } = resolved;
      return {
        ...summary,
        slug: article.slug ?? slugifyArticleTitle(article.title),
        ...(adminTranslation
          ? {
              adminTranslation: {
                ...adminTranslation,
                content: undefined,
              },
            }
          : {}),
      };
    });
  }

  async findOne(id: number, locale?: string, contentLocale?: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    if (
      locale &&
      !contentLocale &&
      !this.hasCompleteTranslation(article, locale)
    ) {
      throw new NotFoundException(
        `Article #${id} is not available in locale "${normalizeContentLocale(locale)}"`,
      );
    }

    const resolved = this.resolveLocale(article, locale, contentLocale);
    const requestedLocale = normalizeContentLocale(
      locale ?? DEFAULT_CONTENT_LOCALE,
    );
    const selected = article.translations.find(
      (item) =>
        item.locale === requestedLocale &&
        item.title.trim() &&
        (item.content.trim() || item.contentJson),
    );
    const fallback = article.translations.find(
      (item) => item.locale === DEFAULT_CONTENT_LOCALE,
    );
    const contentSource = selected ?? fallback;
    const imageLayout =
      article.imageLayoutJson ??
      createArticleImageLayout(
        article.translations.map((translation) =>
          translation.contentJson
            ? normalizeArticleDocument(translation.contentJson)
            : null,
        ),
      );
    let contentPayload:
      | {
          format: 'tiptap-json';
          schemaVersion: number;
          document: ReturnType<typeof normalizeArticleDocument>;
        }
      | { format: 'legacy-html'; html: string };
    if (contentSource?.contentJson) {
      contentPayload = {
        format: 'tiptap-json',
        schemaVersion: contentSource.contentSchemaVersion ?? 1,
        document: applyArticleImageLayout(
          normalizeArticleDocument(contentSource.contentJson),
          imageLayout,
        ),
      };
    } else if (normalizeArticleImageLayout(imageLayout).placements.length) {
      try {
        // Legacy HTML stays untouched in the database. Convert it only for the
        // response so shared article images also appear in un-migrated locales.
        const { articleHtmlToJson } = await import('./article-tiptap.js');
        const legacyDocument = normalizeArticleDocument(
          articleHtmlToJson(
            sanitizeArticleContent(resolved.content) || '<p></p>',
          ),
        );
        contentPayload = {
          format: 'tiptap-json',
          schemaVersion: 1,
          document: applyArticleImageLayout(legacyDocument, imageLayout),
        };
      } catch (error) {
        console.warn('Legacy article could not use the shared image layout', {
          articleId: article.id,
          locale: requestedLocale,
          message: error instanceof Error ? error.message : String(error),
        });
        contentPayload = { format: 'legacy-html', html: resolved.content };
      }
    } else {
      contentPayload = { format: 'legacy-html', html: resolved.content };
    }
    return {
      ...resolved,
      slug: article.slug ?? slugifyArticleTitle(article.title),
      contentPayload,
    };
  }

  async findBySlug(slug: string, locale?: string) {
    const exact = await this.prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (exact) return this.findOne(exact.id, locale);
    const legacy = await this.prisma.article.findMany({
      select: { id: true, title: true },
    });
    const match = legacy.find(
      (item) => slugifyArticleTitle(item.title) === slug,
    );
    if (!match) throw new NotFoundException(`Article "${slug}" not found`);
    return this.findOne(match.id, locale);
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

  async remove(id: number) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        imageUrl: true,
        media: { select: { id: true } },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    await this.prisma.article.delete({
      where: { id },
    });

    return article;
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
