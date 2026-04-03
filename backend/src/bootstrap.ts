import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import { enforceEnvironmentSafety, type AppEnvironment } from './shared/config/app-env';

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
  enforceEnvironmentSafety({
    NODE_ENV: configService.get('NODE_ENV', { infer: true }),
    PORT: configService.get('PORT', { infer: true }),
    API_PREFIX: configService.get('API_PREFIX', { infer: true }),
    DATABASE_URL: configService.get('DATABASE_URL', { infer: true }),
    REDIS_URL: configService.get('REDIS_URL', { infer: true }),
    MEILISEARCH_URL: configService.get('MEILISEARCH_URL', { infer: true }),
    MEILISEARCH_API_KEY: configService.get('MEILISEARCH_API_KEY', { infer: true }),
    S3_ENDPOINT: configService.get('S3_ENDPOINT', { infer: true }),
    S3_REGION: configService.get('S3_REGION', { infer: true }),
    S3_ACCESS_KEY_ID: configService.get('S3_ACCESS_KEY_ID', { infer: true }),
    S3_SECRET_ACCESS_KEY: configService.get('S3_SECRET_ACCESS_KEY', { infer: true }),
    S3_BUCKET_RAW: configService.get('S3_BUCKET_RAW', { infer: true }),
    S3_BUCKET_PUBLIC: configService.get('S3_BUCKET_PUBLIC', { infer: true }),
    JWT_ACCESS_SECRET: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    JWT_REFRESH_SECRET: configService.get('JWT_REFRESH_SECRET', { infer: true }),
    APP_BASE_URL: configService.get('APP_BASE_URL', { infer: true }),
    CDN_BASE_URL: configService.get('CDN_BASE_URL', { infer: true }),
    FRONTEND_URL: configService.get('FRONTEND_URL', { infer: true }),
    FRONTEND_VERIFY_EMAIL_PATH: configService.get('FRONTEND_VERIFY_EMAIL_PATH', { infer: true }),
    FRONTEND_RESET_PASSWORD_PATH: configService.get('FRONTEND_RESET_PASSWORD_PATH', { infer: true }),
    SMTP_URL: configService.get('SMTP_URL', { infer: true }),
    MAIL_FROM_EMAIL: configService.get('MAIL_FROM_EMAIL', { infer: true }),
    MAIL_REPLY_TO_EMAIL: configService.get('MAIL_REPLY_TO_EMAIL', { infer: true }),
    MAIL_QUEUE_ENABLED: configService.get('MAIL_QUEUE_ENABLED', { infer: true }),
    MAIL_QUEUE_CONSUMER_ENABLED: configService.get('MAIL_QUEUE_CONSUMER_ENABLED', { infer: true }),
    BACKGROUND_JOB_QUEUE_ENABLED: configService.get('BACKGROUND_JOB_QUEUE_ENABLED', {
      infer: true,
    }),
    BACKGROUND_JOB_CONSUMER_ENABLED: configService.get('BACKGROUND_JOB_CONSUMER_ENABLED', {
      infer: true,
    }),
    FONT_PROCESSING_QUEUE_ENABLED: configService.get('FONT_PROCESSING_QUEUE_ENABLED', {
      infer: true,
    }),
    FONT_PROCESSING_CONSUMER_ENABLED: configService.get('FONT_PROCESSING_CONSUMER_ENABLED', {
      infer: true,
    }),
    FONT_UPLOAD_MAX_BYTES: configService.get('FONT_UPLOAD_MAX_BYTES', { infer: true }),
    FONT_UPLOAD_MAX_FILES_PER_SUBMISSION: configService.get('FONT_UPLOAD_MAX_FILES_PER_SUBMISSION', {
      infer: true,
    }),
    FONT_UPLOAD_INIT_LIMIT_PER_HOUR: configService.get('FONT_UPLOAD_INIT_LIMIT_PER_HOUR', {
      infer: true,
    }),
    FONT_UPLOAD_COMPLETE_LIMIT_PER_HOUR: configService.get('FONT_UPLOAD_COMPLETE_LIMIT_PER_HOUR', {
      infer: true,
    }),
    ALLOW_DEV_HEADER_AUTH: configService.get('ALLOW_DEV_HEADER_AUTH', { infer: true }),
  });
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
