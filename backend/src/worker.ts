import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrapWorker(): Promise<void> {
  process.env.MAIL_QUEUE_CONSUMER_ENABLED = process.env.MAIL_QUEUE_CONSUMER_ENABLED || 'true';

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('WorkerBootstrap');
  logger.log('Background worker is running');

  const shutdown = async (): Promise<void> => {
    logger.log('Shutting down background worker');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });

  process.once('SIGTERM', () => {
    void shutdown();
  });
}

bootstrapWorker().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
