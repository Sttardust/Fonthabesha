import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

import type { AppEnvironment } from '../shared/config/app-env';
import {
  ProcessUploadPayload,
  ProcessUploadResult,
  UploadProcessingService,
} from './upload-processing.service';

const FONT_PROCESSING_QUEUE_NAME = 'font-processing';

@Injectable()
export class UploadProcessingQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(UploadProcessingQueueService.name);
  private readonly queue: Queue<ProcessUploadPayload> | null;
  private readonly worker: Worker<ProcessUploadPayload> | null;
  private readonly queueConnection: Redis | null;
  private readonly workerConnection: Redis | null;

  constructor(
    configService: ConfigService<AppEnvironment, true>,
    private readonly uploadProcessingService: UploadProcessingService,
  ) {
    const redisUrl = configService.get('REDIS_URL', { infer: true });
    const queueEnabled = configService.get('FONT_PROCESSING_QUEUE_ENABLED', { infer: true });
    const consumerEnabled = configService.get('FONT_PROCESSING_CONSUMER_ENABLED', { infer: true });

    if (redisUrl && queueEnabled) {
      this.queueConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
      this.queue = new Queue<ProcessUploadPayload>(FONT_PROCESSING_QUEUE_NAME, {
        connection: this.queueConnection,
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: 100,
          removeOnFail: 500,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });

      if (consumerEnabled) {
        this.workerConnection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
        });
        this.worker = new Worker<ProcessUploadPayload>(
          FONT_PROCESSING_QUEUE_NAME,
          async (job) => {
            await this.uploadProcessingService.processUpload(job.data);
          },
          {
            connection: this.workerConnection,
          },
        );
        this.worker.on('error', (error) => {
          this.logger.warn(`Font processing worker error: ${error.message}`);
        });
      } else {
        this.workerConnection = null;
        this.worker = null;
      }
    } else {
      this.queueConnection = null;
      this.workerConnection = null;
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.worker?.close().catch(() => undefined),
      this.queue?.close().catch(() => undefined),
      this.workerConnection?.quit().catch(() => undefined),
      this.queueConnection?.quit().catch(() => undefined),
    ]);
  }

  async scheduleUploadProcessing(
    payload: ProcessUploadPayload,
  ): Promise<{ queued: true } | { queued: false; result: ProcessUploadResult }> {
    if (await this.tryEnqueue(`process-upload:${payload.uploadId}`, payload)) {
      return {
        queued: true,
      };
    }

    return {
      queued: false,
      result: await this.uploadProcessingService.processUpload(payload),
    };
  }

  private async tryEnqueue(jobName: string, payload: ProcessUploadPayload): Promise<boolean> {
    if (!this.queue) {
      return false;
    }

    try {
      await this.queue.add(jobName, payload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Font processing queue unavailable, falling back to inline work: ${message}`);
      return false;
    }
  }
}
