import { BadRequestException } from '@nestjs/common';
import type { JSONContent } from '@tiptap/core';
import { ArticleDraftsService } from './article-drafts.service';
import { ArticleMediaService } from './article-media.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ArticleDraftsService base article locale', () => {
  function createService() {
    const prisma = {
      articleDraft: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const service = new ArticleDraftsService(
      prisma as unknown as PrismaService,
      {} as ArticleMediaService,
    );

    return { prisma, service };
  }

  it('rejects a new base draft in a non-Russian locale', async () => {
    const { prisma, service } = createService();

    await expect(service.create(undefined, 'fr')).rejects.toMatchObject({
      constructor: BadRequestException,
      message: 'Articles must be created in Russian first',
    });
    expect(prisma.articleDraft.create).not.toHaveBeenCalled();
  });

  it('still creates a new Russian base draft', async () => {
    const { prisma, service } = createService();
    prisma.articleDraft.create.mockResolvedValue({ id: 'new-ru-draft' });
    prisma.articleDraft.findUnique.mockResolvedValue({
      id: 'new-ru-draft',
      articleId: null,
      locale: 'ru',
      media: [],
    });

    await expect(service.create(undefined, 'ru')).resolves.toMatchObject({
      id: 'new-ru-draft',
      locale: 'ru',
    });
    expect(prisma.articleDraft.create).toHaveBeenCalledTimes(1);
  });

  it('rejects publication of an existing orphaned non-Russian draft', async () => {
    const { prisma, service } = createService();
    prisma.articleDraft.findUnique.mockResolvedValue({
      id: 'legacy-fr-draft',
      articleId: null,
      article: null,
      locale: 'fr',
      version: 2,
      media: [],
    });

    await expect(service.publish('legacy-fr-draft', 2)).rejects.toMatchObject({
      constructor: BadRequestException,
      message: 'Articles must be created in Russian first',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('queues replaced attached cover and removed attached content for deletion', async () => {
    const newContentId = '00000000-0000-4000-8000-000000000001';
    const newCoverId = '00000000-0000-4000-8000-000000000002';
    const oldCoverId = '00000000-0000-4000-8000-000000000003';
    const oldContentId = '00000000-0000-4000-8000-000000000004';
    const contentJson: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Published article text' }],
        },
        {
          type: 'image',
          attrs: {
            mediaId: newContentId,
            src: `/media/articles/media/${newContentId}/original.webp`,
          },
        },
      ],
    };
    const newContent = {
      id: newContentId,
      role: 'CONTENT',
      status: 'DRAFT',
      draftId: 'draft-1',
      articleId: null,
      publicUrl: `/media/articles/media/${newContentId}/original.webp`,
      storagePath: 'articles/media/new-content/original.webp',
      width: 1200,
      height: 800,
    };
    const newCover = {
      id: newCoverId,
      role: 'COVER',
      status: 'DRAFT',
      draftId: 'draft-1',
      articleId: null,
      storagePath: 'articles/media/new-cover/original.webp',
    };
    const tx = {
      article: {
        update: jest.fn().mockResolvedValue({ id: 10 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 10 }),
      },
      articleTranslation: { upsert: jest.fn().mockResolvedValue({}) },
      articleMedia: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      articleDraft: { delete: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      articleDraft: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'draft-1',
          articleId: 10,
          article: {
            id: 10,
            slug: 'published-article',
            imageLayoutJson: null,
            imageLayoutRevision: 0,
          },
          locale: 'ru',
          title: 'Published article',
          excerpt: '',
          contentJson,
          publishedAt: new Date('2026-07-14T00:00:00.000Z'),
          coverMediaId: newCoverId,
          imageLayoutRevision: 0,
          version: 3,
          media: [newContent, newCover],
        }),
      },
      articleMedia: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([newContent])
          .mockResolvedValueOnce([{ id: oldCoverId }, { id: oldContentId }]),
        findUnique: jest.fn().mockResolvedValue(newCover),
      },
      $transaction: jest.fn(
        async (operation: (client: typeof tx) => Promise<unknown>) =>
          operation(tx),
      ),
    };
    const articleMedia = {
      deletePendingMedia: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ArticleDraftsService(
      prisma as unknown as PrismaService,
      articleMedia as unknown as ArticleMediaService,
    );

    await service.publish('draft-1', 3);

    expect(prisma.articleMedia.findMany).toHaveBeenNthCalledWith(2, {
      where: { articleId: 10, status: 'ATTACHED' },
      select: { id: true },
    });
    expect(tx.articleMedia.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: [oldCoverId, oldContentId] } },
      data: {
        articleId: null,
        draftId: null,
        status: 'PENDING_DELETE',
      },
    });
    expect(articleMedia.deletePendingMedia).toHaveBeenCalledTimes(2);
    expect(articleMedia.deletePendingMedia).toHaveBeenCalledWith(oldCoverId);
    expect(articleMedia.deletePendingMedia).toHaveBeenCalledWith(oldContentId);
  });
});
