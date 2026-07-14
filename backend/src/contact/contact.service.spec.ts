import { BadRequestException } from '@nestjs/common';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  const service = new ContactService();

  it.each([undefined, null, 'not an object', []])(
    'rejects a non-object request body with 400',
    async (body) => {
      await expect(service.sendContactRequest(body)).rejects.toThrow(
        BadRequestException,
      );
    },
  );
});
