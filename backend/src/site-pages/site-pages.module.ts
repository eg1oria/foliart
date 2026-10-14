import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { SitePagesController } from './site-pages.controller';
import { SitePagesService } from './site-pages.service';

@Module({
  controllers: [SitePagesController],
  providers: [SitePagesService, AdminApiGuard],
})
export class SitePagesModule {}
