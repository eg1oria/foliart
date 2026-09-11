import { PrismaService } from '../prisma/prisma.service';
import { SiteImagesService } from './site-images.service';

describe('SiteImagesService', () => {
  const storedRow = {
    key: 'home-hero',
    imageUrl: 'site/1757000000000-home-hero.webp',
    width: 1920,
    height: 1080,
    revision: 2,
    createdAt: new Date('2026-09-10T10:00:00.000Z'),
    updatedAt: new Date('2026-09-11T10:00:00.000Z'),
  };

  function createService(existing: typeof storedRow | null = null) {
    const prisma = {
      siteImage: {
        findMany: jest.fn().mockResolvedValue(existing ? [existing] : []),
        findUnique: jest.fn().mockResolvedValue(existing),
        upsert: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    };

    return {
      prisma,
      service: new SiteImagesService(prisma as unknown as PrismaService),
    };
  }

  it('returns an empty set while nothing has been replaced', async () => {
    const { service } = createService();

    await expect(service.findAll()).resolves.toEqual({});
  });

  it('returns the whole set keyed by slot', async () => {
    const { service } = createService(storedRow);

    await expect(service.findAll()).resolves.toEqual({
      'home-hero': {
        imageUrl: storedRow.imageUrl,
        width: 1920,
        height: 1080,
        revision: 2,
        updatedAt: storedRow.updatedAt,
      },
    });
  });

  it('creates the first upload at revision 1', async () => {
    const { prisma, service } = createService();

    await expect(
      service.save('home-hero', {
        imageUrl: 'site/1.webp',
        width: 100,
        height: 50,
      }),
    ).resolves.toBeNull();

    expect(prisma.siteImage.upsert).toHaveBeenCalledWith({
      where: { key: 'home-hero' },
      create: {
        key: 'home-hero',
        imageUrl: 'site/1.webp',
        width: 100,
        height: 50,
        revision: 1,
      },
      update: {
        imageUrl: 'site/1.webp',
        width: 100,
        height: 50,
        revision: { increment: 1 },
      },
    });
  });

  it('hands the replaced file back so the caller can unlink it', async () => {
    const { service } = createService(storedRow);

    await expect(
      service.save('home-hero', {
        imageUrl: 'site/2.webp',
        width: 100,
        height: 50,
      }),
    ).resolves.toMatchObject({ imageUrl: storedRow.imageUrl });
  });

  it('drops the row on reset and reports the file it removed', async () => {
    const { prisma, service } = createService(storedRow);

    await expect(service.reset('home-hero')).resolves.toMatchObject({
      imageUrl: storedRow.imageUrl,
    });
    expect(prisma.siteImage.delete).toHaveBeenCalledWith({
      where: { key: 'home-hero' },
    });
  });

  it('leaves a slot that was never replaced alone', async () => {
    const { prisma, service } = createService();

    await expect(service.reset('home-hero')).resolves.toBeNull();
    expect(prisma.siteImage.delete).not.toHaveBeenCalled();
  });
});
