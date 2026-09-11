import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SiteImageFile = {
  imageUrl: string;
  width: number;
  height: number;
};

export type SiteImageDocument = SiteImageFile & {
  revision: number;
  updatedAt: Date;
};

@Injectable()
export class SiteImagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * The whole set in one object so a page render costs a single request: a
   * per-key endpoint would mean two dozen round trips for the home page alone.
   */
  async findAll(): Promise<Record<string, SiteImageDocument>> {
    const images = await this.prisma.siteImage.findMany();

    return Object.fromEntries(
      images.map((image) => [
        image.key,
        {
          imageUrl: image.imageUrl,
          width: image.width,
          height: image.height,
          revision: image.revision,
          updatedAt: image.updatedAt,
        },
      ]),
    );
  }

  /** Returns the file that was replaced, so the caller can delete it. */
  async save(key: string, file: SiteImageFile) {
    const previous = await this.prisma.siteImage.findUnique({ where: { key } });

    await this.prisma.siteImage.upsert({
      where: { key },
      create: { key, ...file, revision: 1 },
      update: { ...file, revision: { increment: 1 } },
    });

    return previous;
  }

  /** Returns the removed file, so the caller can delete it. */
  async reset(key: string) {
    const previous = await this.prisma.siteImage.findUnique({ where: { key } });

    if (previous) {
      await this.prisma.siteImage.delete({ where: { key } });
    }

    return previous;
  }
}
