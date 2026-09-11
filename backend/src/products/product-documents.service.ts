import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizeContentLocale } from '../content-locales';
import { PrismaService } from '../prisma/prisma.service';

export type ProductDocumentFile = {
  fileUrl: string;
  mimeType: string;
  originalName: string;
  byteSize: number;
};

export type CreateProductDocumentInput = ProductDocumentFile & {
  productId: number;
  locale: string;
  title: string;
};

export const documentOrderBy = [
  { sortOrder: 'asc' as const },
  { id: 'asc' as const },
];

@Injectable()
export class ProductDocumentsService {
  constructor(private prisma: PrismaService) {}

  private async requireProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }
  }

  async findByProduct(productId: number, locale?: string) {
    await this.requireProduct(productId);

    return this.prisma.productDocument.findMany({
      where: {
        productId,
        ...(locale ? { locale: normalizeContentLocale(locale) } : {}),
      },
      orderBy: documentOrderBy,
    });
  }

  async findOne(productId: number, documentId: number) {
    const document = await this.prisma.productDocument.findFirst({
      where: { id: documentId, productId },
    });

    if (!document) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }

    return document;
  }

  /** New files land at the end of the list for their own language. */
  async create(input: CreateProductDocumentInput) {
    await this.requireProduct(input.productId);

    const locale = normalizeContentLocale(input.locale);
    const last = await this.prisma.productDocument.findFirst({
      where: { productId: input.productId, locale },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.productDocument.create({
      data: {
        productId: input.productId,
        locale,
        title: input.title,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType,
        originalName: input.originalName,
        byteSize: input.byteSize,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async rename(productId: number, documentId: number, title: string) {
    await this.findOne(productId, documentId);

    return this.prisma.productDocument.update({
      where: { id: documentId },
      data: { title },
    });
  }

  /**
   * Swaps a document with its neighbour in the same language, so the admin can
   * reorder the links shown on the product page without re-uploading anything.
   */
  async move(productId: number, documentId: number, direction: 'up' | 'down') {
    const document = await this.findOne(productId, documentId);
    const siblings = await this.prisma.productDocument.findMany({
      where: { productId, locale: document.locale },
      orderBy: documentOrderBy,
      select: { id: true },
    });

    const index = siblings.findIndex((item) => item.id === documentId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return document;
    }

    const reordered = [...siblings];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    await this.prisma.$transaction(
      reordered.map((item, sortOrder) =>
        this.prisma.productDocument.update({
          where: { id: item.id },
          data: { sortOrder },
        }),
      ),
    );

    return this.findOne(productId, documentId);
  }

  /** Returns the removed row so the caller can delete the stored file. */
  async remove(productId: number, documentId: number) {
    const document = await this.findOne(productId, documentId);

    await this.prisma.productDocument.delete({ where: { id: documentId } });

    return document;
  }
}
