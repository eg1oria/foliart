import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query('locale') locale?: string) {
    return this.categoriesService.findAll(locale);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
  ) {
    return this.categoriesService.findOne(id, locale);
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  updateTranslations(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
  ) {
    return this.categoriesService.updateTranslations(id, {
      nameEn: body.nameEn?.trim() ?? '',
      descriptionEn: body.descriptionEn?.trim() ?? '',
    });
  }
}
