import {
  BadRequestException,
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
import {
  isSupportedContentLocale,
  normalizeContentLocale,
} from '../content-locales';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.categoriesService.findAll(locale, contentLocale);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.categoriesService.findOne(id, locale, contentLocale);
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  updateTranslations(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
  ) {
    const localeInput =
      body.contentLocale ?? (body.nameEn || body.descriptionEn ? 'en' : 'ru');

    if (!isSupportedContentLocale(localeInput)) {
      throw new BadRequestException('Unsupported content locale');
    }

    const contentLocale = normalizeContentLocale(localeInput);

    return this.categoriesService.updateTranslation(id, {
      locale: contentLocale,
      name: (body.name ?? body.nameEn)?.trim() ?? '',
      description: (body.description ?? body.descriptionEn)?.trim() ?? '',
    });
  }
}
