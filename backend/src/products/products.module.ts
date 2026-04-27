import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  providers: [ProductsService, AdminApiGuard],
  controllers: [ProductsController],
})
export class ProductsModule {}
