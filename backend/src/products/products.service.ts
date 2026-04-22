import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateProductInput = {
  categoryId: number;
  name: string;
  description: string;
  advantages: string;
  imageUrl: string;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findByCategory(categoryId: number) {
    return this.prisma.product.findMany({
      where: { categoryId },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async create(input: CreateProductInput) {
    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category #${input.categoryId} not found`);
    }

    const product = await this.prisma.product.create({
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        advantages: input.advantages,
        imageUrl: input.imageUrl,
      },
    });

    const productCount = await this.prisma.product.count({
      where: { categoryId: input.categoryId },
    });

    await this.prisma.category.update({
      where: { id: input.categoryId },
      data: { productCount },
    });

    return product;
  }
}
