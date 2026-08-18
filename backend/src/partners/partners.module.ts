import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  controllers: [PartnersController],
  providers: [PartnersService, AdminApiGuard],
})
export class PartnersModule {}
