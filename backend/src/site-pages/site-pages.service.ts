import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ContentLocale } from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SitePageSettingsInput,
  SitePageTranslationInput,
} from './site-pages.validation';

export type SitePageImageInput = {
  imageUrl: string;
  originalName: string;
  width: number;
  height: number;
  byteSize: number;
};

const translationSummarySelect = {
  locale: true,
  title: true,
  published: true,
  updatedAt: true,
} as const;

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class SitePagesService {
  constructor(private prisma: PrismaService) {}

  /** Admin list: every page with the state of each language, without HTML. */
  findAll() {
    return this.prisma.sitePage.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: { translations: { select: translationSummarySelect } },
    });
  }

  async findOne(id: number) {
    const page = await this.prisma.sitePage.findUnique({
      where: { id },
      include: {
        translations: true,
        images: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    return page;
  }

  /**
   * The public view of one language. A page that exists but is not published
   * in this language answers exactly like a missing one.
   */
  async findPublished(slug: string, locale: ContentLocale) {
    const page = await this.prisma.sitePage.findUnique({
      where: { slug },
      include: {
        translations: {
          where: { published: true },
          select: {
            locale: true,
            title: true,
            description: true,
            html: true,
            updatedAt: true,
          },
        },
      },
    });
    const translation = page?.translations.find(
      (item) => item.locale === locale,
    );

    if (!page || !translation) {
      throw new NotFoundException(`Page "${slug}" not found`);
    }

    return {
      slug: page.slug,
      displayMode: page.displayMode,
      showTitle: page.showTitle,
      bandColor: page.bandColor,
      locale,
      title: translation.title,
      description: translation.description,
      html: translation.html,
      updatedAt: translation.updatedAt,
      publishedLocales: page.translations.map((item) => item.locale),
    };
  }

  /** Every published page with its ready languages, for the sitemap. */
  async findAllPublished() {
    const pages = await this.prisma.sitePage.findMany({
      where: { translations: { some: { published: true } } },
      orderBy: { id: 'asc' },
      select: {
        slug: true,
        translations: {
          where: { published: true },
          select: { locale: true, updatedAt: true },
        },
      },
    });

    return pages.map((page) => ({
      slug: page.slug,
      locales: page.translations.map((translation) => translation.locale),
      updatedAt: page.translations.reduce<Date | null>(
        (latest, translation) =>
          !latest || translation.updatedAt > latest
            ? translation.updatedAt
            : latest,
        null,
      ),
    }));
  }

  async create(input: SitePageSettingsInput) {
    try {
      return await this.prisma.sitePage.create({
        data: input,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A page at "${input.slug}" already exists`);
      }

      throw error;
    }
  }

  /** Returns the slug the page had before, so callers can revalidate it. */
  async updateSettings(id: number, input: SitePageSettingsInput) {
    const previous = await this.requirePage(id);

    try {
      const page = await this.prisma.sitePage.update({
        where: { id },
        data: input,
      });

      return { ...page, previousSlug: previous.slug };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A page at "${input.slug}" already exists`);
      }

      throw error;
    }
  }

  async saveTranslation(
    id: number,
    locale: ContentLocale,
    input: SitePageTranslationInput,
  ) {
    const page = await this.requirePage(id);

    const [translation] = await this.prisma.$transaction([
      this.prisma.sitePageTranslation.upsert({
        where: { pageId_locale: { pageId: id, locale } },
        create: { pageId: id, locale, ...input },
        update: input,
      }),
      // The list is ordered by the last edit, whichever language it touched.
      this.prisma.sitePage.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return { slug: page.slug, ...translation };
  }

  /**
   * Returns the deleted page with its image URLs so the files can go too. The
   * images are read first: the cascade removes their rows with the page, and
   * an `include` on the delete itself comes back empty.
   */
  async remove(id: number) {
    const page = await this.prisma.sitePage.findUnique({
      where: { id },
      select: { id: true, slug: true, images: { select: { imageUrl: true } } },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    await this.prisma.sitePage.delete({ where: { id } });

    return page;
  }

  async addImage(id: number, input: SitePageImageInput) {
    await this.requirePage(id);

    return this.prisma.sitePageImage.create({
      data: { pageId: id, ...input },
    });
  }

  async removeImage(id: number, imageId: number) {
    const image = await this.prisma.sitePageImage.findFirst({
      where: { id: imageId, pageId: id },
    });

    if (!image) {
      throw new NotFoundException(`Image #${imageId} not found`);
    }

    return this.prisma.sitePageImage.delete({ where: { id: imageId } });
  }

  private async requirePage(id: number) {
    const page = await this.prisma.sitePage.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    return page;
  }
}
