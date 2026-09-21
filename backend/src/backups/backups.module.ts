import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({
  controllers: [BackupsController],
  providers: [BackupsService, AdminApiGuard],
})
export class BackupsModule {}
