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
        findMany: jest.fn(),
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

  it('returns the current shared cover for every locale draft', async () => {
    const { prisma, service } = createService();
    const currentCover = {
      id: '00000000-0000-4000-8000-000000000010',
      role: 'COVER',
      status: 'ATTACHED',
      articleId: 10,
      draftId: null,
      publicUrl: '/media/articles/media/current/original.webp',
      previewUrl: '/media/articles/media/current/preview.webp',
      width: 1200,
      height: 800,
    };
    prisma.articleDraft.findMany.mockResolvedValue([
      {
        id: 'english-draft',
        articleId: 10,
        locale: 'en',
        coverMediaId: '00000000-0000-4000-8000-000000000011',
        media: [],
        article: {
          coverMediaId: currentCover.id,
          media: [currentCover],
        },
      },
    ]);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'english-draft',
        coverMediaId: currentCover.id,
        media: [currentCover],
      }),
    ]);
  });

  it('normalizes a stale locale cover while saving the draft', async () => {
    const staleCoverId = '00000000-0000-4000-8000-000000000012';
    const currentCoverId = '00000000-0000-4000-8000-000000000013';
    const contentJson: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'English article text' }],
        },
      ],
    };
    const currentCover = {
      id: currentCoverId,
      role: 'COVER',
      status: 'ATTACHED',
      articleId: 10,
      draftId: null,
      publicUrl: '/media/articles/media/current/original.webp',
      previewUrl: '/media/articles/media/current/preview.webp',
      width: 1200,
      height: 800,
    };
    const draft = {
      id: 'english-draft',
      articleId: 10,
      locale: 'en',
      title: 'English article',
      excerpt: '',
      contentJson,
      publishedAt: new Date('2026-07-14T00:00:00.000Z'),
      coverMediaId: staleCoverId,
      imageLayoutRevision: 0,
      version: 2,
      media: [],
    };
    const prisma = {
      articleDraft: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            ...draft,
            article: {
              id: 10,
              coverMediaId: currentCoverId,
              imageLayoutJson: null,
              imageLayoutRevision: 0,
            },
          })
          .mockResolvedValueOnce({
            ...draft,
            coverMediaId: currentCoverId,
            version: 3,
            article: {
              coverMediaId: currentCoverId,
              media: [currentCover],
            },
          }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      articleMedia: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new ArticleDraftsService(
      prisma as unknown as PrismaService,
      {} as ArticleMediaService,
    );

    await expect(
      service.save('english-draft', {
        version: 2,
        imageLayoutRevision: 0,
        title: draft.title,
        excerpt: draft.excerpt,
        contentJson,
        publishedAt: '2026-07-14',
        coverMediaId: staleCoverId,
      }),
    ).resolves.toMatchObject({
      coverMediaId: currentCoverId,
      media: [currentCover],
    });

    const [updateInput] = prisma.articleDraft.updateMany.mock
      .calls[0] as unknown as [{ data: { coverMediaId?: string } }];
    expect(updateInput.data.coverMediaId).toBe(currentCoverId);
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
            coverMediaId: oldCoverId,
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

  it('does not restore a stale cover when another locale is published', async () => {
    const staleCoverId = '00000000-0000-4000-8000-000000000020';
    const currentCoverId = '00000000-0000-4000-8000-000000000021';
    const currentCover = {
      id: currentCoverId,
      role: 'COVER',
      status: 'ATTACHED',
      draftId: null,
      articleId: 10,
      storagePath: 'articles/media/current-cover/original.webp',
    };
    const tx = {
      article: {
        update: jest.fn().mockResolvedValue({ id: 10 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 10 }),
      },
      articleTranslation: { upsert: jest.fn().mockResolvedValue({}) },
      articleMedia: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      articleDraft: { delete: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      articleDraft: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'english-draft',
          articleId: 10,
          article: {
            id: 10,
            slug: 'published-article',
            coverMediaId: currentCoverId,
            imageLayoutJson: null,
            imageLayoutRevision: 0,
          },
          locale: 'en',
          title: 'Published article',
          excerpt: '',
          contentJson: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Published article text' }],
              },
            ],
          },
          publishedAt: new Date('2026-07-14T00:00:00.000Z'),
          coverMediaId: staleCoverId,
          imageLayoutRevision: 0,
          version: 3,
          media: [],
        }),
      },
      articleMedia: {
        findMany: jest.fn().mockResolvedValue([currentCover]),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(currentCover),
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

    await service.publish('english-draft', 3);

    expect(prisma.articleMedia.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: currentCoverId },
    });
    expect(tx.article.update).toHaveBeenCalledTimes(1);
    const [updateInput] = tx.article.update.mock.calls[0] as unknown as [
      {
        where: { id: number };
        data: { coverMediaId?: string; imageUrl?: string };
      },
    ];
    expect(updateInput).toMatchObject({
      where: { id: 10 },
      data: {
        coverMediaId: currentCoverId,
        imageUrl: currentCover.storagePath,
      },
    });
    expect(articleMedia.deletePendingMedia).not.toHaveBeenCalled();
  });
});
