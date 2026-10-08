import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env';
import { CorsIoAdapter } from './realtime/cors-io.adapter';

/** Shared by main.ts and the e2e tests, so tests exercise the production wiring. */
export function configureApp(app: NestExpressApplication) {
  const web = app.get(ConfigService<Env, true>).get('WEB_URL', { infer: true });
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '2mb' });
  app.enableCors({ origin: web, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useWebSocketAdapter(new CorsIoAdapter(app, web));
  app.enableShutdownHooks();
  return app;
}
