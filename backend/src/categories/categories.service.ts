import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const legacyCategoryImageUrlMap: Record<string, string> = {
  '/catalog-categories/5.jpeg': '/catalog-categories/2.jpeg',
  '/catalog-categories/6.png': '/catalog-categories/4.png',
};

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    return categories.map((category) => this.normalizeCategory(category));
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return this.normalizeCategory(category);
  }

  private normalizeCategory<T extends { imageUrl: string }>(category: T): T {
    return {
      ...category,
      imageUrl: legacyCategoryImageUrlMap[category.imageUrl] ?? category.imageUrl,
    };
  }
}
