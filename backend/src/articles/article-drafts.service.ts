import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ArticleMedia } from '@prisma/client';
import type { JSONContent } from '@tiptap/core';
import { randomUUID } from 'node:crypto';
import {
  ARTICLE_CONTENT_SCHEMA_VERSION,
  EMPTY_ARTICLE_DOCUMENT,
  getArticleDocumentMediaIds,
  getArticleDocumentText,
  hasPendingArticleUploads,
  normalizeArticleDocument,
} from './article-content-json';
import { slugifyArticleTitle } from './article-slug.util';
import {
  isSupportedContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleMediaService } from './article-media.service';

type SaveDraftInput = {
  version: number;
  title?: unknown;
  excerpt?: unknown;
  contentJson?: unknown;
  publishedAt?: unknown;
  coverMediaId?: unknown;
};

function parsePublishedAt(value: unknown, fallback = new Date()) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00.000Z`
    : value.trim();
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime()))
    throw new BadRequestException('Published date is invalid');
  return parsed;
}

function plainText(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function createExcerpt(excerpt: string, document: JSONContent) {
  const value = excerpt || getArticleDocumentText(document);
  return value.length <= 220 ? value : `${value.slice(0, 217).trimEnd()}...`;
}

function canonicalizeMedia(
  document: JSONContent,
  mediaById: Map<string, ArticleMedia>,
): JSONContent {
  const visit = (node: JSONContent): JSONContent => {
    const content = node.content?.map(visit);
    if (node.type !== 'image' || typeof node.attrs?.mediaId !== 'string') {
      return { ...node, ...(content ? { content } : {}) };
    }
    const media = mediaById.get(node.attrs.mediaId);
    if (!media)
      throw new BadRequestException(
        'Article image is not owned by this draft or article',
      );
    return {
      ...node,
      attrs: {
        ...node.attrs,
        src: media.publicUrl,
        width: media.width,
        height: media.height,
      },
      ...(content ? { content } : {}),
    };
  };
  return visit(document);
}

@Injectable()
export class ArticleDraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly articleMedia: ArticleMediaService,
  ) {}

  private async serializeDraft(id: string) {
    const draft = await this.prisma.articleDraft.findUnique({
      where: { id },
      include: {
        media: { where: { status: 'DRAFT' }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!draft) throw new NotFoundException('Article draft not found');
    return draft;
  }

  async list() {
    return this.prisma.articleDraft.findMany({
      include: { media: { where: { status: 'DRAFT' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string) {
    return this.serializeDraft(id);
  }

  async create(articleId: number | undefined, requestedLocale: string) {
    const locale = normalizeContentLocale(requestedLocale);
    if (!isSupportedContentLocale(locale))
      throw new BadRequestException('Unsupported content locale');

    if (articleId) {
      const existing = await this.prisma.articleDraft.findUnique({
        where: { articleId_locale: { articleId, locale } },
      });
      if (existing) return this.serializeDraft(existing.id);

      const article = await this.prisma.article.findUnique({
        where: { id: articleId },
        include: { translations: true },
      });
      if (!article)
        throw new NotFoundException(`Article #${articleId} not found`);
      const selected = article.translations.find(
        (item) => item.locale === locale,
      );
      const source = selected;
      const legacyHtml =
        source?.content ||
        (locale === 'en' ? article.contentEn : article.content);
      let document: JSONContent;
      if (source?.contentJson) {
        document = normalizeArticleDocument(source.contentJson);
      } else {
        // Kept lazy so CommonJS Jest can boot the API without loading happy-dom's ESM bundle.
        const { articleHtmlToJson } = await import('./article-tiptap.js');
        document = normalizeArticleDocument(
          articleHtmlToJson(legacyHtml || '<p></p>'),
        );
      }
      const created = await this.prisma.articleDraft.create({
        data: {
          id: randomUUID(),
          articleId,
          locale,
          title:
            source?.title ||
            (locale === 'en' ? article.titleEn : article.title),
          excerpt:
            source?.excerpt ||
            (locale === 'en' ? article.excerptEn : article.excerpt),
          contentJson: document,
          contentSchemaVersion: ARTICLE_CONTENT_SCHEMA_VERSION,
          publishedAt: article.publishedAt,
          coverMediaId: article.coverMediaId,
        },
      });
      return this.serializeDraft(created.id);
    }

    const created = await this.prisma.articleDraft.create({
      data: {
        id: randomUUID(),
        locale,
        contentJson: EMPTY_ARTICLE_DOCUMENT,
        contentSchemaVersion: ARTICLE_CONTENT_SCHEMA_VERSION,
      },
    });
    return this.serializeDraft(created.id);
  }

  async save(id: string, input: SaveDraftInput) {
    if (!Number.isInteger(input.version) || input.version < 0) {
      throw new BadRequestException('Draft version is invalid');
    }
    const draft = await this.prisma.articleDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Article draft not found');
    const document = normalizeArticleDocument(input.contentJson, {
      allowPendingUploads: true,
    });
    const coverMediaId =
      typeof input.coverMediaId === 'string' && input.coverMediaId
        ? input.coverMediaId
        : input.coverMediaId === null
          ? null
          : draft.coverMediaId;
    if (coverMediaId) {
      const cover = await this.prisma.articleMedia.findUnique({
        where: { id: coverMediaId },
      });
      if (
        !cover ||
        cover.role !== 'COVER' ||
        (cover.draftId !== id && cover.articleId !== draft.articleId)
      ) {
        throw new BadRequestException(
          'Cover image does not belong to this draft',
        );
      }
    }

    const result = await this.prisma.articleDraft.updateMany({
      where: { id, version: input.version },
      data: {
        title: plainText(input.title, 300),
        excerpt: plainText(input.excerpt, 220),
        contentJson: document,
        publishedAt: parsePublishedAt(input.publishedAt, draft.publishedAt),
        coverMediaId,
        version: { increment: 1 },
      },
    });
    if (!result.count)
      throw new ConflictException(
        'Article draft was changed in another session',
      );
    return this.serializeDraft(id);
  }

  private async uniqueSlug(title: string) {
    const base = slugifyArticleTitle(title);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.article.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async publish(id: string, expectedVersion: number) {
    const draft = await this.prisma.articleDraft.findUnique({
      where: { id },
      include: { media: true, article: true },
    });
    if (!draft) throw new NotFoundException('Article draft not found');
    if (draft.version !== expectedVersion)
      throw new ConflictException(
        'Article draft was changed in another session',
      );
    const document = normalizeArticleDocument(draft.contentJson);
    if (hasPendingArticleUploads(document))
      throw new BadRequestException('Finish or remove pending image uploads');
    const title = draft.title.trim();
    if (!title || !getArticleDocumentText(document))
      throw new BadRequestException('Article title and content are required');

    const mediaIds = getArticleDocumentMediaIds(document);
    const media = mediaIds.size
      ? await this.prisma.articleMedia.findMany({
          where: { id: { in: [...mediaIds] } },
        })
      : [];
    for (const item of media) {
      if (
        item.role !== 'CONTENT' ||
        (item.draftId !== id && item.articleId !== draft.articleId)
      ) {
        throw new BadRequestException(
          'Article image does not belong to this draft',
        );
      }
    }
    if (media.length !== mediaIds.size)
      throw new BadRequestException('One or more article images are missing');
    const canonicalDocument = canonicalizeMedia(
      document,
      new Map(media.map((item) => [item.id, item])),
    );
    const cover = draft.coverMediaId
      ? await this.prisma.articleMedia.findUnique({
          where: { id: draft.coverMediaId },
        })
      : null;
    if (
      !draft.articleId &&
      (!cover || cover.role !== 'COVER' || cover.draftId !== id)
    ) {
      throw new BadRequestException('Cover image is required');
    }
    if (cover && cover.draftId !== id && cover.articleId !== draft.articleId) {
      throw new BadRequestException(
        'Cover image does not belong to this draft',
      );
    }

    const excerpt = createExcerpt(draft.excerpt.trim(), canonicalDocument);
    const contentJson = canonicalDocument as Prisma.InputJsonValue;
    const slug = draft.article?.slug ?? (await this.uniqueSlug(title));
    const attachedIds = new Set([...mediaIds, ...(cover ? [cover.id] : [])]);
    const pendingDeleteIds = draft.media
      .filter((item) => !attachedIds.has(item.id))
      .map((item) => item.id);

    const article = await this.prisma.$transaction(async (tx) => {
      let articleId = draft.articleId;
      if (!articleId) {
        const created = await tx.article.create({
          data: {
            slug,
            title,
            excerpt,
            content: '',
            imageUrl: cover!.storagePath,
            coverMediaId: cover!.id,
            publishedAt: draft.publishedAt,
          },
        });
        articleId = created.id;
      } else {
        await tx.article.update({
          where: { id: articleId },
          data: {
            slug,
            publishedAt: draft.publishedAt,
            ...(cover
              ? { coverMediaId: cover.id, imageUrl: cover.storagePath }
              : {}),
            ...(draft.locale === 'ru' ? { title, excerpt } : {}),
            ...(draft.locale === 'en'
              ? { titleEn: title, excerptEn: excerpt }
              : {}),
          },
        });
      }

      await tx.articleTranslation.upsert({
        where: { articleId_locale: { articleId, locale: draft.locale } },
        create: {
          articleId,
          locale: draft.locale,
          title,
          excerpt,
          content: '',
          contentJson,
          contentSchemaVersion: ARTICLE_CONTENT_SCHEMA_VERSION,
          revision: 1,
        },
        update: {
          title,
          excerpt,
          contentJson,
          contentSchemaVersion: ARTICLE_CONTENT_SCHEMA_VERSION,
          revision: { increment: 1 },
        },
      });
      if (attachedIds.size) {
        await tx.articleMedia.updateMany({
          where: { id: { in: [...attachedIds] } },
          data: { articleId, draftId: null, status: 'ATTACHED' },
        });
      }
      if (pendingDeleteIds.length) {
        await tx.articleMedia.updateMany({
          where: { id: { in: pendingDeleteIds } },
          data: { draftId: null, status: 'PENDING_DELETE' },
        });
      }
      await tx.articleDraft.delete({ where: { id } });
      return tx.article.findUniqueOrThrow({ where: { id: articleId } });
    });

    await Promise.all(
      pendingDeleteIds.map((mediaId) =>
        this.articleMedia.deletePendingMedia(mediaId),
      ),
    );
    return article;
  }

  async discard(id: string) {
    const draft = await this.prisma.articleDraft.findUnique({
      where: { id },
      include: { media: { where: { status: 'DRAFT' } } },
    });
    if (!draft) throw new NotFoundException('Article draft not found');
    const mediaIds = draft.media.map((item) => item.id);
    await this.prisma.$transaction(async (tx) => {
      if (mediaIds.length) {
        await tx.articleMedia.updateMany({
          where: { id: { in: mediaIds } },
          data: { draftId: null, status: 'PENDING_DELETE' },
        });
      }
      await tx.articleDraft.delete({ where: { id } });
    });
    await Promise.all(
      mediaIds.map((mediaId) => this.articleMedia.deletePendingMedia(mediaId)),
    );
    return { id };
  }
}
