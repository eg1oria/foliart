import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { CalendarsController } from './calendars.controller';
import { CalendarsService } from './calendars.service';

@Module({
  controllers: [CalendarsController],
  providers: [CalendarsService, AdminApiGuard],
})
export class CalendarsModule {}
