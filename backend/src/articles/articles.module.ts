import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticleDraftsController } from './article-drafts.controller';
import { ArticleDraftsService } from './article-drafts.service';
import { ArticleMediaService } from './article-media.service';

@Module({
  controllers: [ArticlesController, ArticleDraftsController],
  providers: [
    ArticlesService,
    ArticleDraftsService,
    ArticleMediaService,
    AdminApiGuard,
  ],
})
export class ArticlesModule {}
