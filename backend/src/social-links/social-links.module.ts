import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { SocialLinksController } from './social-links.controller';
import { SocialLinksService } from './social-links.service';

@Module({
  controllers: [SocialLinksController],
  providers: [SocialLinksService, AdminApiGuard],
})
export class SocialLinksModule {}
