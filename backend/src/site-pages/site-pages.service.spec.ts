import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SitePagesService } from './site-pages.service';

describe('SitePagesService', () => {
  const updatedAt = new Date('2026-10-14T10:00:00.000Z');

  function createService(page: unknown = null) {
    const sitePage = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(page),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 1, slug: 'renamed' }),
      delete: jest.fn(),
    };
    const sitePageTranslation = {
      upsert: jest.fn().mockResolvedValue({ locale: 'en', published: true }),
    };
    const prisma = {
      sitePage,
      sitePageTranslation,
      sitePageImage: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };

    return {
      prisma,
      service: new SitePagesService(prisma as unknown as PrismaService),
    };
  }

  it('serves a published language with the list of ready ones', async () => {
    const { service } = createService({
      slug: 'promo',
      displayMode: 'fullscreen',
      showTitle: false,
      bandColor: '#2f5be0',
      translations: [
        {
          locale: 'ru',
          title: 'Акция',
          description: '',
          html: '<p>ru</p>',
          updatedAt,
        },
        {
          locale: 'fr',
          title: 'Promo',
          description: 'd',
          html: '<p>fr</p>',
          updatedAt,
        },
      ],
    });

    await expect(service.findPublished('promo', 'fr')).resolves.toEqual({
      slug: 'promo',
      displayMode: 'fullscreen',
      showTitle: false,
      bandColor: '#2f5be0',
      locale: 'fr',
      title: 'Promo',
      description: 'd',
      html: '<p>fr</p>',
      updatedAt,
      publishedLocales: ['ru', 'fr'],
    });
  });

  it('answers 404 for a language that is not published', async () => {
    const { service } = createService({
      slug: 'promo',
      displayMode: 'embedded',
      translations: [
        {
          locale: 'ru',
          title: 'Акция',
          description: '',
          html: '<p>ru</p>',
          updatedAt,
        },
      ],
    });

    await expect(service.findPublished('promo', 'en')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports a taken address as a conflict', async () => {
    const { prisma, service } = createService();
    prisma.sitePage.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create({
        slug: 'promo',
        displayMode: 'embedded',
        showTitle: true,
        bandColor: '#0e2438',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the previous address after a rename', async () => {
    const { service } = createService({ id: 1, slug: 'promo' });

    await expect(
      service.updateSettings(1, {
        slug: 'renamed',
        displayMode: 'embedded',
        showTitle: true,
        bandColor: '#0e2438',
      }),
    ).resolves.toEqual({ id: 1, slug: 'renamed', previousSlug: 'promo' });
  });

  it('upserts one language and touches the page', async () => {
    const { prisma, service } = createService({ id: 1, slug: 'promo' });
    const input = {
      title: 'Promo',
      description: '',
      html: '<p>x</p>',
      published: true,
    };

    await expect(service.saveTranslation(1, 'en', input)).resolves.toEqual({
      slug: 'promo',
      locale: 'en',
      published: true,
    });
    expect(prisma.sitePageTranslation.upsert).toHaveBeenCalledWith({
      where: { pageId_locale: { pageId: 1, locale: 'en' } },
      create: { pageId: 1, locale: 'en', ...input },
      update: input,
    });
    expect(prisma.sitePage.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { updatedAt: expect.any(Date) as Date },
    });
  });

  it('refuses to save a translation of a missing page', async () => {
    const { service } = createService();

    await expect(
      service.saveTranslation(9, 'ru', {
        title: '',
        description: '',
        html: '',
        published: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports the images of a deleted page so their files can go', async () => {
    const { prisma, service } = createService({
      id: 1,
      slug: 'promo',
      images: [{ imageUrl: 'site-pages/a.webp' }],
    });

    await expect(service.remove(1)).resolves.toEqual({
      id: 1,
      slug: 'promo',
      images: [{ imageUrl: 'site-pages/a.webp' }],
    });
    expect(prisma.sitePage.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('only removes an image of the given page', async () => {
    const { prisma, service } = createService();
    prisma.sitePageImage.findFirst.mockResolvedValue(null);

    await expect(service.removeImage(1, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.sitePageImage.findFirst).toHaveBeenCalledWith({
      where: { id: 5, pageId: 1 },
    });
    expect(prisma.sitePageImage.delete).not.toHaveBeenCalled();
  });
});
