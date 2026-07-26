import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { UiMessagesService } from './ui-messages.service';
import {
  parseUiMessageLocale,
  parseUiMessageResetBody,
  parseUiMessageWriteBody,
} from './ui-messages.validation';

@Controller('ui-messages')
export class UiMessagesController {
  constructor(private readonly uiMessages: UiMessagesService) {}

  @Get(':locale')
  get(@Param('locale') localeInput: string) {
    return this.uiMessages.get(parseUiMessageLocale(localeInput));
  }

  @Put(':locale')
  @UseGuards(AdminApiGuard)
  save(@Param('locale') localeInput: string, @Body() body: unknown) {
    const locale = parseUiMessageLocale(localeInput);
    const { messages, expectedRevision } = parseUiMessageWriteBody(body);
    return this.uiMessages.save(locale, messages, expectedRevision);
  }

  @Delete(':locale')
  @UseGuards(AdminApiGuard)
  reset(@Param('locale') localeInput: string, @Body() body: unknown) {
    const locale = parseUiMessageLocale(localeInput);
    const { expectedRevision } = parseUiMessageResetBody(body);
    return this.uiMessages.reset(locale, expectedRevision);
  }
}
