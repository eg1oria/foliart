import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let service: ArticlesService;
  const prismaServiceMock = {
    article: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const russianTranslation = {
    locale: 'ru',
    title: 'Русская статья',
    excerpt: 'Русское описание',
    content: '<p>Русский текст</p>',
    contentJson: null,
    contentSchemaVersion: null,
  };
  const baseArticle = {
    id: 1,
    slug: 'russian-article',
    title: 'Русская статья',
    titleEn: '',
    excerpt: 'Русское описание',
    excerptEn: '',
    content: '<p>Русский текст</p>',
    contentEn: '',
    imageUrl: 'articles/cover.webp',
    publishedAt: new Date('2026-07-14T00:00:00.000Z'),
    viewCount: 0,
    coverMediaId: null,
    imageLayoutJson: null,
    imageLayoutRevision: 0,
    updatedAt: new Date('2026-07-14T00:00:00.000Z'),
    translations: [russianTranslation],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  it('hides articles without a complete translation from a public locale', async () => {
    prismaServiceMock.article.findMany.mockResolvedValue([
      {
        ...baseArticle,
        translations: [
          russianTranslation,
          {
            locale: 'fr',
            title: 'Article français',
            excerpt: 'Description française',
            content: '',
            contentJson: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Texte français' }],
                },
              ],
            },
            contentSchemaVersion: 1,
          },
        ],
      },
      {
        ...baseArticle,
        id: 2,
        slug: 'untranslated-article',
        translations: [
          russianTranslation,
          {
            locale: 'fr',
            title: 'Titre incomplet',
            excerpt: '',
            content: '',
            contentJson: null,
            contentSchemaVersion: null,
          },
        ],
      },
    ]);

    const articles = await service.findAll('fr');

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      id: 1,
      title: 'Article français',
    });
  });

  it('keeps untranslated articles visible in the admin translation list', async () => {
    prismaServiceMock.article.findMany.mockResolvedValue([
      baseArticle,
      {
        ...baseArticle,
        id: 2,
        slug: 'another-article',
      },
    ]);

    const articles = await service.findAll('fr', 'fr');

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      adminTranslation: {
        locale: 'fr',
        hasTranslation: false,
        isComplete: false,
      },
    });
  });

  it('returns not found for a direct public link without a translation', async () => {
    prismaServiceMock.article.findUnique.mockResolvedValue(baseArticle);

    await expect(service.findOne(1, 'es')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
