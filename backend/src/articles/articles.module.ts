import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  controllers: [ArticlesController],
  providers: [ArticlesService, AdminApiGuard],
})
export class ArticlesModule {}
