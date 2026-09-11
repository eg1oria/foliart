import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { SiteImagesController } from './site-images.controller';
import { SiteImagesService } from './site-images.service';

@Module({
  controllers: [SiteImagesController],
  providers: [SiteImagesService, AdminApiGuard],
})
export class SiteImagesModule {}
