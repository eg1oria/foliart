import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { SocialLinksService } from './social-links.service';
import {
  parseSocialLinkLocale,
  parseSocialLinksWriteBody,
} from './social-links.validation';

@Controller('social-links')
export class SocialLinksController {
  constructor(private readonly socialLinks: SocialLinksService) {}

  @Get(':locale')
  findAll(@Param('locale') localeInput: string) {
    return this.socialLinks.findAll(parseSocialLinkLocale(localeInput));
  }

  @Put(':locale')
  @UseGuards(AdminApiGuard)
  replaceAll(@Param('locale') localeInput: string, @Body() body: unknown) {
    const locale = parseSocialLinkLocale(localeInput);

    return this.socialLinks.replaceAll(locale, parseSocialLinksWriteBody(body));
  }
}
