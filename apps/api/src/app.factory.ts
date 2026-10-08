import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { config } from './config.js';

/** Crea la app con la configuración común (la usan main.ts y los tests). */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigins });
  app.enableShutdownHooks();
  return app;
}
