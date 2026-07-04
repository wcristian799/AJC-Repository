import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) {
    return configured;
  }

  return [
    'https://ajcmvp.vercel.app',
    'https://apiajc.byteintelligence.com.br',
    'http://localhost:8080',
    'http://localhost:3000',
  ];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;
  await app.listen(port);
  Logger.log(`API AJC ouvindo em http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
