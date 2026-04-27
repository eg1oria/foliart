import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  providers: [CategoriesService, AdminApiGuard],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
