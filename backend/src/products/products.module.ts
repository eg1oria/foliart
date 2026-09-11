import { Module } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { ProductDocumentsController } from './product-documents.controller';
import { ProductDocumentsService } from './product-documents.service';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  providers: [ProductsService, ProductDocumentsService, AdminApiGuard],
  controllers: [ProductsController, ProductDocumentsController],
})
export class ProductsModule {}
