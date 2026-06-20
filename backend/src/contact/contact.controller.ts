import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { ContactRequestBody } from './contact.service';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  submit(@Body() body: ContactRequestBody) {
    return this.contactService.sendContactRequest(body);
  }
}
