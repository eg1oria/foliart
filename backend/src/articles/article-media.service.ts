import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import {
  createArticleMediaVariants,
  type MemoryImageUploadFile,
} from '../images/image-upload.util';

@Injectable()
export class ArticleMediaService {
  constructor(private readonly prisma: PrismaService) {}

  private async removeFiles(storagePath: string, previewPath: string) {
    const articlesRoot = `${join(process.cwd(), 'images', 'articles')}/`;
    const paths = [storagePath, previewPath].map((value) =>
      join(process.cwd(), 'images', value),
    );
    if (paths.some((value) => !value.startsWith(articlesRoot))) {
      throw new Error('Unsafe article media path');
    }
    await Promise.allSettled(
      paths.map((value) => fs.rm(value, { force: true })),
    );
    const generatedDirectory = dirname(paths[0]);
    if (
      generatedDirectory === dirname(paths[1]) &&
      generatedDirectory.startsWith(`${articlesRoot}media/`)
    ) {
      await fs.rm(generatedDirectory, { force: true, recursive: true });
    }
  }

  async storeDraftMedia(args: {
    draftId: string;
    uploadId: string;
    role: 'COVER' | 'CONTENT';
    file: MemoryImageUploadFile;
  }) {
    const draft = await this.prisma.articleDraft.findUnique({
      where: { id: args.draftId },
    });
    if (!draft) throw new NotFoundException('Article draft not found');
    const existing = await this.prisma.articleMedia.findUnique({
      where: { uploadId: args.uploadId },
    });
    if (existing) {
      if (existing.draftId !== draft.id)
        throw new BadRequestException('Upload ID belongs to another draft');
      return existing;
    }

    const id = randomUUID();
    const stored = await createArticleMediaVariants(args.file, id);
    try {
      return await this.prisma.articleMedia.create({
        data: {
          id,
          uploadId: args.uploadId,
          role: args.role,
          draftId: draft.id,
          status: 'DRAFT',
          originalName: args.file.originalname.slice(0, 255),
          ...stored,
        },
      });
    } catch (error) {
      await this.removeFiles(stored.storagePath, stored.previewPath);
      throw error;
    }
  }

  async deleteDraftMedia(draftId: string, mediaId: string) {
    const media = await this.prisma.articleMedia.findFirst({
      where: { id: mediaId, draftId, status: 'DRAFT' },
    });
    if (!media) throw new NotFoundException('Draft media not found');
    await this.prisma.articleMedia.update({
      where: { id: media.id },
      data: { status: 'PENDING_DELETE', draftId: null },
    });
    await this.deletePendingMedia(media.id);
  }

  async deleteArticleMedia(mediaIds: string[]) {
    if (!mediaIds.length) return;
    await this.prisma.articleMedia.updateMany({
      where: { id: { in: mediaIds } },
      data: { articleId: null, draftId: null, status: 'PENDING_DELETE' },
    });
    await Promise.all(mediaIds.map((id) => this.deletePendingMedia(id)));
  }

  async deletePendingMedia(id: string) {
    const media = await this.prisma.articleMedia.findUnique({ where: { id } });
    if (!media || media.status !== 'PENDING_DELETE') return;
    try {
      await this.removeFiles(media.storagePath, media.previewPath);
      await this.prisma.articleMedia.delete({ where: { id: media.id } });
    } catch (error) {
      console.warn('Article media deletion will be retried', {
        mediaId: media.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Interval(60_000)
  async retryPendingDeletes() {
    const pending = await this.prisma.articleMedia.findMany({
      where: { status: 'PENDING_DELETE' },
      select: { id: true },
      take: 50,
    });
    await Promise.all(pending.map((item) => this.deletePendingMedia(item.id)));
  }
}
