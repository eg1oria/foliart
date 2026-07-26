import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AdminApiGuard } from '../admin-api.guard';
import { UiMessagesController } from './ui-messages.controller';
import { UiMessagesService } from './ui-messages.service';

describe('UiMessagesController', () => {
  let app: INestApplication;
  const previousSecret = process.env.ADMIN_API_SECRET;
  const service = {
    get: jest.fn(),
    reset: jest.fn(),
    save: jest.fn(),
  };
  const getHttpServer = () => app.getHttpServer() as App;

  beforeAll(async () => {
    process.env.ADMIN_API_SECRET = 'ui-messages-test-secret';
    const module = await Test.createTestingModule({
      controllers: [UiMessagesController],
      providers: [
        AdminApiGuard,
        { provide: UiMessagesService, useValue: service },
      ],
    }).compile();

    app = module.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    (app as NestExpressApplication).useBodyParser('json', { limit: '256kb' });
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.get.mockResolvedValue({
      locale: 'ru',
      messages: null,
      revision: 0,
      updatedAt: null,
    });
    service.save.mockResolvedValue({
      locale: 'ru',
      messages: { Home: { title: 'Saved' } },
      revision: 1,
      updatedAt: new Date('2026-07-26T10:00:00.000Z'),
    });
  });

  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) {
      delete process.env.ADMIN_API_SECRET;
    } else {
      process.env.ADMIN_API_SECRET = previousSecret;
    }
  });

  it('serves the public empty state', async () => {
    await request(getHttpServer()).get('/ui-messages/ru').expect(200).expect({
      locale: 'ru',
      messages: null,
      revision: 0,
      updatedAt: null,
    });
  });

  it('rejects unsupported locales', async () => {
    await request(getHttpServer()).get('/ui-messages/de').expect(400);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('requires the correct admin secret for writes', async () => {
    const body = {
      expectedRevision: 0,
      messages: { Home: { title: 'Saved' } },
    };

    await request(getHttpServer())
      .put('/ui-messages/ru')
      .send(body)
      .expect(401);
    await request(getHttpServer())
      .put('/ui-messages/ru')
      .set('x-admin-secret', 'wrong')
      .send(body)
      .expect(401);
    await request(getHttpServer())
      .put('/ui-messages/ru')
      .set('x-admin-secret', 'ui-messages-test-secret')
      .send(body)
      .expect(200);

    expect(service.save).toHaveBeenCalledWith(
      'ru',
      { Home: { title: 'Saved' } },
      0,
    );
  });

  it('rejects oversized JSON before it reaches the service', async () => {
    await request(getHttpServer())
      .put('/ui-messages/ru')
      .set('x-admin-secret', 'ui-messages-test-secret')
      .send({
        expectedRevision: 0,
        messages: { value: 'x'.repeat(256 * 1024) },
      })
      .expect(413);

    expect(service.save).not.toHaveBeenCalled();
  });

  it('accepts a valid JSON document between the old 100 KiB and new 256 KiB limits', async () => {
    await request(getHttpServer())
      .put('/ui-messages/ru')
      .set('x-admin-secret', 'ui-messages-test-secret')
      .send({
        expectedRevision: 0,
        messages: { value: 'x'.repeat(150 * 1024) },
      })
      .expect(200);

    expect(service.save).toHaveBeenCalledTimes(1);
  });
});
