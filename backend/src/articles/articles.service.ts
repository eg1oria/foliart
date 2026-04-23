import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateArticleInput = {
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  imageUrl: string;
  publishedAt: Date;
};

type UpdateArticleInput = {
  id: number;
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  publishedAt: Date;
  imageUrl?: string;
};

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  private resolveLocale<
    T extends {
      title: string;
      titleEn: string;
      excerpt: string;
      excerptEn: string;
      content: string;
      contentEn: string;
    },
  >(article: T, locale?: string) {
    const useEnglish = locale === 'en';

    return {
      ...article,
      title:
        useEnglish && article.titleEn.trim() ? article.titleEn : article.title,
      excerpt:
        useEnglish && article.excerptEn.trim()
          ? article.excerptEn
          : article.excerpt,
      content:
        useEnglish && article.contentEn.trim()
          ? article.contentEn
          : article.content,
      slugSourceTitle: article.title,
    };
  }

  async findAll(locale?: string) {
    const articles = await this.prisma.article.findMany({
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });

    return articles.map((article) => this.resolveLocale(article, locale));
  }

  async findOne(id: number, locale?: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    return this.resolveLocale(article, locale);
  }

  async create(input: CreateArticleInput) {
    return this.prisma.article.create({
      data: {
        title: input.title,
        titleEn: input.titleEn,
        excerpt: input.excerpt,
        excerptEn: input.excerptEn,
        content: input.content,
        contentEn: input.contentEn,
        imageUrl: input.imageUrl,
        publishedAt: input.publishedAt,
      },
    });
  }

  async update(input: UpdateArticleInput) {
    await this.findOne(input.id);

    return this.prisma.article.update({
      where: { id: input.id },
      data: {
        title: input.title,
        titleEn: input.titleEn,
        excerpt: input.excerpt,
        excerptEn: input.excerptEn,
        content: input.content,
        contentEn: input.contentEn,
        publishedAt: input.publishedAt,
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      },
    });
  }

  async incrementViewCount(id: number) {
    await this.findOne(id);

    return this.prisma.article.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        viewCount: true,
      },
    });
  }
}
