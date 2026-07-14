import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  submit(
    @Headers('content-type') contentType: string | undefined,
    @Body() body: unknown,
  ) {
    const mediaType = contentType?.split(';', 1)[0].trim().toLowerCase();
    const isJson =
      mediaType === 'application/json' ||
      (mediaType?.startsWith('application/') && mediaType.endsWith('+json'));

    if (!isJson) {
      throw new UnsupportedMediaTypeException(
        'Content-Type must be application/json',
      );
    }

    return this.contactService.sendContactRequest(body);
  }
}
