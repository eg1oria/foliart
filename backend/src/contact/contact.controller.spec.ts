import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

describe('ContactController', () => {
  let app: INestApplication<App>;
  const contactServiceMock = {
    sendContactRequest: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactService,
          useValue: contactServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a text body with 415 without calling the service', async () => {
    await request(app.getHttpServer())
      .post('/api/contact')
      .set('Content-Type', 'text/plain')
      .send('{"formType":"contact"}')
      .expect(415);

    expect(contactServiceMock.sendContactRequest).not.toHaveBeenCalled();
  });

  it('passes an application/json body to the service', async () => {
    const body = {
      formType: 'contact',
      name: 'Test',
      comment: 'Message',
      consent: true,
    };

    await request(app.getHttpServer())
      .post('/api/contact')
      .send(body)
      .expect(200, { ok: true });

    expect(contactServiceMock.sendContactRequest).toHaveBeenCalledWith(body);
  });
});
