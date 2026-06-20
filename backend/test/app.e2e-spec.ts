import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('rate-limits repeated article view requests', async () => {
    for (let requestIndex = 0; requestIndex < 30; requestIndex += 1) {
      await request(app.getHttpServer())
        .post('/articles/999999/views')
        .expect(404);
    }

    await request(app.getHttpServer())
      .post('/articles/999999/views')
      .expect(429);
  });

  afterEach(async () => {
    await app.close();
  });
});
