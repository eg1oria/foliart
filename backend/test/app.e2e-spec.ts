import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

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

  const articleJsonIt = process.env.ARTICLE_JSON_E2E === '1' ? it : it.skip;

  articleJsonIt(
    'returns body-free summaries and JSON detail by stable slug',
    async () => {
      const list = await request(app.getHttpServer())
        .get('/articles?locale=ru')
        .expect(200);
      const summaries = list.body as unknown as Array<{
        slug: string;
        content?: unknown;
      }>;
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries).toHaveLength(8);
      expect(summaries[0]).toHaveProperty('slug');
      expect(summaries[0]).not.toHaveProperty('content');

      const detail = await request(app.getHttpServer())
        .get(`/articles/by-slug/${summaries[0].slug}?locale=ru`)
        .expect(200);
      const body = detail.body as unknown as { contentPayload: unknown };
      expect(body.contentPayload).toMatchObject({
        format: 'tiptap-json',
        schemaVersion: 1,
        document: { type: 'doc' },
      });
    },
  );

  articleJsonIt(
    'autosaves with optimistic locking and rejects spoofed uploads',
    async () => {
      const adminHeaders = {
        'x-admin-secret': 'foliart-admin-api-secret-2026',
      };
      const created = await request(app.getHttpServer())
        .post('/articles/drafts')
        .set(adminHeaders)
        .send({ locale: 'ru' })
        .expect(201);
      const draft = created.body as unknown as {
        id: string;
        version: number;
        contentJson: unknown;
      };

      const saved = await request(app.getHttpServer())
        .patch(`/articles/drafts/${draft.id}`)
        .set(adminHeaders)
        .send({
          version: draft.version,
          title: 'Draft title',
          excerpt: '',
          publishedAt: '2026-07-11',
          contentJson: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Draft body' }],
              },
            ],
          },
        })
        .expect(200);
      expect((saved.body as unknown as { version: number }).version).toBe(1);

      await request(app.getHttpServer())
        .patch(`/articles/drafts/${draft.id}`)
        .set(adminHeaders)
        .send({ version: 0, title: 'Stale', contentJson: draft.contentJson })
        .expect(409);

      await request(app.getHttpServer())
        .post(`/articles/drafts/${draft.id}/media`)
        .set(adminHeaders)
        .field('uploadId', randomUUID())
        .field('role', 'CONTENT')
        .attach(
          'image',
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
          { filename: 'fake.png', contentType: 'image/png' },
        )
        .expect(400);

      const png = await sharp({
        create: {
          width: 20,
          height: 20,
          channels: 3,
          background: '#008000',
        },
      })
        .png()
        .toBuffer();
      await request(app.getHttpServer())
        .post(`/articles/drafts/${draft.id}/media`)
        .set(adminHeaders)
        .field('uploadId', randomUUID())
        .field('role', 'CONTENT')
        .attach('image', png, {
          filename: 'leaf.png',
          contentType: 'image/png',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/articles/drafts/${draft.id}?confirm=true`)
        .set(adminHeaders)
        .expect(200);
    },
  );

  afterEach(async () => {
    await app.close();
  });
});
