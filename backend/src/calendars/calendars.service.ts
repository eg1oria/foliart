import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateCalendarEntryInput = {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  imageUrl1: string;
  imageUrl2: string;
  imageUrl3: string;
  imageUrl4: string;
};

type UpdateCalendarEntryInput = {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  imageUrl1?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  imageUrl4?: string;
};

@Injectable()
export class CalendarsService {
  constructor(private prisma: PrismaService) {}

  private resolveLocale<
    T extends {
      title: string;
      titleEn: string;
      description: string;
      descriptionEn: string;
      imageUrl1: string;
      imageUrl2: string;
      imageUrl3: string;
      imageUrl4: string;
    },
  >(entry: T, locale?: string) {
    const useEnglish = locale === 'en';

    return {
      ...entry,
      title: useEnglish && entry.titleEn.trim() ? entry.titleEn : entry.title,
      description:
        useEnglish && entry.descriptionEn.trim()
          ? entry.descriptionEn
          : entry.description,
      imageUrls: [
        entry.imageUrl1,
        entry.imageUrl2,
        entry.imageUrl3,
        entry.imageUrl4,
      ],
      slugSourceTitle: entry.title,
    };
  }

  async findAll(locale?: string) {
    const entries = await this.prisma.calendarEntry.findMany({
      orderBy: { id: 'asc' },
    });

    return entries.map((entry) => this.resolveLocale(entry, locale));
  }

  async findOne(id: number, locale?: string) {
    const entry = await this.prisma.calendarEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(`Calendar entry #${id} not found`);
    }

    return this.resolveLocale(entry, locale);
  }

  async create(input: CreateCalendarEntryInput) {
    return this.prisma.calendarEntry.create({
      data: {
        title: input.title,
        titleEn: input.titleEn,
        description: input.description,
        descriptionEn: input.descriptionEn,
        imageUrl1: input.imageUrl1,
        imageUrl2: input.imageUrl2,
        imageUrl3: input.imageUrl3,
        imageUrl4: input.imageUrl4,
      },
    });
  }

  async update(input: UpdateCalendarEntryInput) {
    await this.findOne(input.id);

    return this.prisma.calendarEntry.update({
      where: { id: input.id },
      data: {
        title: input.title,
        titleEn: input.titleEn,
        description: input.description,
        descriptionEn: input.descriptionEn,
        ...(input.imageUrl1 ? { imageUrl1: input.imageUrl1 } : {}),
        ...(input.imageUrl2 ? { imageUrl2: input.imageUrl2 } : {}),
        ...(input.imageUrl3 ? { imageUrl3: input.imageUrl3 } : {}),
        ...(input.imageUrl4 ? { imageUrl4: input.imageUrl4 } : {}),
      },
    });
  }
}
