import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { UiMessagesController } from './ui-messages.controller';
import { UiMessagesService } from './ui-messages.service';

@Module({
  controllers: [UiMessagesController],
  providers: [UiMessagesService, AdminApiGuard],
})
export class UiMessagesModule {}
