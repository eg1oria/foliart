import 'dotenv/config';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { getAdminApiSecret } from './admin-api.guard';
import { AppModule } from './app.module';

const developmentOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// Never fall back to `*`: an unset FRONTEND_URL must fail closed in production
// and fall back to the local dev frontend everywhere else.
function getAllowedOrigins() {
  const configured = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL must be set');
  }

  return developmentOrigins;
}

async function bootstrap() {
  getAdminApiSecret();
  const allowedOrigins = getAllowedOrigins();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '256kb' });
  app.set('trust proxy', 1);
  app.set('x-powered-by', false);
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    // Nothing this service returns — JSON or a re-encoded upload — should ever
    // load a subresource, so anything smuggled into a stored file stays inert.
    // PDFs are exempt: they are rendered by the browser's own viewer and a
    // locked-down policy can keep it from displaying them.
    if (!request.path.toLowerCase().endsWith('.pdf')) {
      response.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      );
    }

    next();
  });
  app.enableCors({
    origin: allowedOrigins,
  });
  app.useStaticAssets(join(process.cwd(), 'images'), {
    prefix: '/images/',
    maxAge: '7d',
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
