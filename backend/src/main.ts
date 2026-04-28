import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : '*',
  });
  app.useStaticAssets(join(process.cwd(), 'images'), {
    prefix: '/images/',
    maxAge: '7d',
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
