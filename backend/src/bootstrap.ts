import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import type { AppEnvironment } from './shared/config/app-env';

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  configureApp(app);
  return app;
}

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get<ConfigService<AppEnvironment, true>>(ConfigService);
  const apiPrefix = configService.get('API_PREFIX', { infer: true });
  const frontendUrl = configService.get('FRONTEND_URL', { infer: true });
  const allowedOrigins = new Set([frontendUrl, 'http://localhost:5173']);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  });
  app.setGlobalPrefix(apiPrefix);
}
