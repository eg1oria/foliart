import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminApiGuard],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}
