import { BadRequestException } from '@nestjs/common';
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
});
