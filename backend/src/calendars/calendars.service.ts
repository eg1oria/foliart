import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_CONTENT_LOCALE,
  isDefaultContentLocale,
  isLegacyEnglishContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';
import { createUniquePublicSlug } from '../public-slug.util';

type CalendarTranslationFields = {
  title: string;
  description: string;
};

type CalendarEntryWithLegacyAndTranslations = CalendarTranslationFields & {
  titleEn: string;
  descriptionEn: string;
  imageUrl1: string;
  imageUrl2: string;
  imageUrl3: string;
  imageUrl4: string;
  translations?: Array<CalendarTranslationFields & { locale: string }>;
};

type CreateCalendarEntryInput = CalendarTranslationFields & {
  contentLocale: string;
  imageUrl1: string;
  imageUrl2: string;
  imageUrl3: string;
  imageUrl4: string;
};

type UpdateCalendarEntryInput = CalendarTranslationFields & {
  id: number;
  contentLocale: string;
  imageUrl1?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  imageUrl4?: string;
};

@Injectable()
export class CalendarsService {
  constructor(private prisma: PrismaService) {}

  private getTranslation(
    entry: CalendarEntryWithLegacyAndTranslations,
    locale: string,
  ) {
    const normalizedLocale = normalizeContentLocale(locale);
    const translation = entry.translations?.find(
      (item) => item.locale === normalizedLocale,
    );

    if (translation) {
      return { ...translation, hasTranslation: true };
    }

    if (isDefaultContentLocale(normalizedLocale)) {
      return {
        title: entry.title,
        description: entry.description,
        hasTranslation: false,
      };
    }

    if (isLegacyEnglishContentLocale(normalizedLocale)) {
      return {
        title: entry.titleEn,
        description: entry.descriptionEn,
        hasTranslation: false,
      };
    }

    return {
      title: '',
      description: '',
      hasTranslation: false,
    };
  }

  private resolveLocale<T extends CalendarEntryWithLegacyAndTranslations>(
    entry: T,
    locale?: string,
    contentLocale?: string,
  ) {
    const fallback = this.getTranslation(entry, DEFAULT_CONTENT_LOCALE);
    const selected = locale ? this.getTranslation(entry, locale) : fallback;

    const adminLocale = contentLocale
      ? normalizeContentLocale(contentLocale)
      : null;
    const adminTranslation = adminLocale
      ? this.getTranslation(entry, adminLocale)
      : null;

    const { translations: _translations, ...entryFields } = entry;

    const resolve = (
      selectedValue: string,
      fallbackValue: string,
      originalValue: string,
    ): string => {
      if (locale && selectedValue.trim()) return selectedValue;
      if (locale) return fallbackValue;
      return originalValue;
    };

    return {
      ...entryFields,
      title: resolve(selected.title, fallback.title, entry.title),
      description: resolve(
        selected.description,
        fallback.description,
        entry.description,
      ),
      imageUrls: [
        entry.imageUrl1,
        entry.imageUrl2,
        entry.imageUrl3,
        entry.imageUrl4,
      ].filter((url): url is string => Boolean(url?.trim())),
      slugSourceTitle: entry.title,
      ...(adminTranslation && adminLocale
        ? {
            adminTranslation: {
              locale: adminLocale,
              hasTranslation: adminTranslation.hasTranslation,
              isComplete:
                Boolean(adminTranslation.title.trim()) &&
                Boolean(adminTranslation.description.trim()),
              title: adminTranslation.title,
              description: adminTranslation.description,
            },
          }
        : {}),
    };
  }

  private getCreateLegacyFields(
    contentLocale: string,
    input: CalendarTranslationFields,
  ) {
    const isDefault = isDefaultContentLocale(contentLocale);
    const isLegacyEn = isLegacyEnglishContentLocale(contentLocale);

    return {
      title: isDefault ? input.title : '',
      titleEn: isLegacyEn ? input.title : '',
      description: isDefault ? input.description : '',
      descriptionEn: isLegacyEn ? input.description : '',
    };
  }

  private getUpdateLegacyFields(
    contentLocale: string,
    input: CalendarTranslationFields,
  ) {
    if (isDefaultContentLocale(contentLocale)) {
      return {
        title: input.title,
        description: input.description,
      };
    }

    if (isLegacyEnglishContentLocale(contentLocale)) {
      return {
        titleEn: input.title,
        descriptionEn: input.description,
      };
    }
    return {};
  }

  async findAll(locale?: string, contentLocale?: string) {
    const entries = await this.prisma.calendarEntry.findMany({
      include: { translations: true },
      orderBy: { id: 'asc' },
    });

    return entries.map((entry) =>
      this.resolveLocale(entry, locale, contentLocale),
    );
  }

  async findOne(id: number, locale?: string, contentLocale?: string) {
    const entry = await this.prisma.calendarEntry.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!entry) {
      throw new NotFoundException(`Calendar entry #${id} not found`);
    }

    return this.resolveLocale(entry, locale, contentLocale);
  }

  async create(input: CreateCalendarEntryInput) {
    const contentLocale = normalizeContentLocale(input.contentLocale);
    const slug = await createUniquePublicSlug(input.title, async (candidate) =>
      Boolean(
        await this.prisma.calendarEntry.findFirst({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
    );

    return this.prisma.calendarEntry.create({
      data: {
        slug,
        ...this.getCreateLegacyFields(contentLocale, input),
        imageUrl1: input.imageUrl1,
        imageUrl2: input.imageUrl2,
        imageUrl3: input.imageUrl3,
        imageUrl4: input.imageUrl4,
        translations: {
          create: {
            locale: contentLocale,
            title: input.title,
            description: input.description,
          },
        },
      },
    });
  }

  async update(input: UpdateCalendarEntryInput) {
    const exists = await this.prisma.calendarEntry.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Calendar entry #${input.id} not found`);
    }

    const contentLocale = normalizeContentLocale(input.contentLocale);

    return this.prisma.calendarEntry.update({
      where: { id: input.id },
      data: {
        ...this.getUpdateLegacyFields(contentLocale, input),
        ...(input.imageUrl1 ? { imageUrl1: input.imageUrl1 } : {}),
        ...(input.imageUrl2 ? { imageUrl2: input.imageUrl2 } : {}),
        ...(input.imageUrl3 ? { imageUrl3: input.imageUrl3 } : {}),
        ...(input.imageUrl4 ? { imageUrl4: input.imageUrl4 } : {}),
        translations: {
          upsert: {
            where: {
              calendarEntryId_locale: {
                calendarEntryId: input.id,
                locale: contentLocale,
              },
            },
            update: {
              title: input.title,
              description: input.description,
            },
            create: {
              locale: contentLocale,
              title: input.title,
              description: input.description,
            },
          },
        },
      },
    });
  }

  async remove(id: number) {
    const entry = await this.prisma.calendarEntry.findUnique({
      where: { id },
      select: {
        id: true,
        imageUrl1: true,
        imageUrl2: true,
        imageUrl3: true,
        imageUrl4: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Calendar entry #${id} not found`);
    }

    await this.prisma.calendarEntry.delete({
      where: { id },
    });

    return entry;
  }
}
