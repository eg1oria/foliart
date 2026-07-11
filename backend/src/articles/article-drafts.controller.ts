import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminApiGuard } from '../admin-api.guard';
import {
  maxImageUploadBytes,
  type MemoryImageUploadFile,
} from '../images/image-upload.util';
import { ArticleDraftsService } from './article-drafts.service';
import { ArticleMediaService } from './article-media.service';

@Controller('articles/drafts')
@UseGuards(AdminApiGuard)
export class ArticleDraftsController {
  constructor(
    private readonly drafts: ArticleDraftsService,
    private readonly media: ArticleMediaService,
  ) {}

  @Get()
  list() {
    return this.drafts.list();
  }

  @Post()
  create(@Body() body: { articleId?: number; locale?: string }) {
    const articleId =
      body.articleId === undefined ? undefined : Number(body.articleId);
    if (
      articleId !== undefined &&
      (!Number.isInteger(articleId) || articleId < 1)
    ) {
      throw new BadRequestException('Article ID is invalid');
    }
    return this.drafts.create(articleId, body.locale ?? 'ru');
  }

  @Get(':draftId')
  get(@Param('draftId') draftId: string) {
    return this.drafts.get(draftId);
  }

  @Patch(':draftId')
  save(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.drafts.save(draftId, {
      version: Number(body.version),
      title: body.title,
      excerpt: body.excerpt,
      contentJson: body.contentJson,
      publishedAt: body.publishedAt,
      coverMediaId: body.coverMediaId,
    });
  }

  @Post(':draftId/media')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: maxImageUploadBytes },
    }),
  )
  upload(
    @Param('draftId') draftId: string,
    @Body() body: { uploadId?: string; role?: string },
    @UploadedFile() file?: MemoryImageUploadFile,
  ) {
    if (!file?.buffer || !body.uploadId)
      throw new BadRequestException('Image and upload ID are required');
    if (body.role !== 'COVER' && body.role !== 'CONTENT')
      throw new BadRequestException('Image role is invalid');
    return this.media.storeDraftMedia({
      draftId,
      uploadId: body.uploadId,
      role: body.role,
      file,
    });
  }

  @Delete(':draftId/media/:mediaId')
  removeMedia(
    @Param('draftId') draftId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.deleteDraftMedia(draftId, mediaId);
  }

  @Post(':draftId/publish')
  publish(
    @Param('draftId') draftId: string,
    @Body() body: { version?: number },
  ) {
    return this.drafts.publish(draftId, Number(body.version));
  }

  @Delete(':draftId')
  discard(
    @Param('draftId') draftId: string,
    @Query('confirm') confirm?: string,
  ) {
    if (confirm !== 'true')
      throw new BadRequestException('Draft deletion must be confirmed');
    return this.drafts.discard(draftId);
  }
}
