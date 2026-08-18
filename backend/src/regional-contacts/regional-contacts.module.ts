import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { RegionalContactsController } from './regional-contacts.controller';
import { RegionalContactsService } from './regional-contacts.service';

@Module({
  controllers: [RegionalContactsController],
  providers: [RegionalContactsService, AdminApiGuard],
})
export class RegionalContactsModule {}
