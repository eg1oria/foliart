import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private resolveLocale<T extends { name: string; nameEn: string; description: string; descriptionEn: string }>(
    category: T,
    locale?: string,
  ) {
    const useEnglish = locale === 'en';
    const localizedName = useEnglish && category.nameEn.trim() ? category.nameEn : category.name;
    const localizedDescription =
      useEnglish && category.descriptionEn.trim() ? category.descriptionEn : category.description;

    return {
      ...category,
      name: localizedName,
      description: localizedDescription,
      slugSourceName: category.name,
    };
  }

  async findAll(locale?: string) {
    const categories = await this.prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    return categories.map((category) => this.resolveLocale(category, locale));
  }

  async findOne(id: number, locale?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return this.resolveLocale(category, locale);
  }

  async updateTranslations(id: number, input: { nameEn: string; descriptionEn: string }) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        nameEn: input.nameEn,
        descriptionEn: input.descriptionEn,
      },
    });
  }
}
