import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;
  await app.listen(port);
  Logger.log(`API AJC ouvindo em http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
