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

  /**
   * Returns the file that was replaced, so the caller can delete it. The read
   * and the write share a transaction: two uploads to one slot must not both
   * see the same previous row, or the file of the one that lost stays on disk
   * with nothing pointing at it.
   */
  async save(key: string, file: SiteImageFile) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.siteImage.findUnique({ where: { key } });

      await tx.siteImage.upsert({
        where: { key },
        create: { key, ...file, revision: 1 },
        update: { ...file, revision: { increment: 1 } },
      });

      return previous;
    });
  }

  /** Returns the removed file, so the caller can delete it. */
  async reset(key: string) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.siteImage.findUnique({ where: { key } });

      if (previous) {
        await tx.siteImage.delete({ where: { key } });
      }

      return previous;
    });
  }
}
