import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

import { DownloadsService } from '../downloads/downloads.service';
import { SearchIndexService } from '../search/search-index.service';
import type { AppEnvironment } from '../shared/config/app-env';

type SearchSyncJob = {
  type: 'search_sync';
  familyId: string;
  operation: 'upsert' | 'remove';
};

type FamilyPackageWarmupJob = {
  type: 'family_package_warmup';
  familyId: string;
};

type BackgroundJobPayload = SearchSyncJob | FamilyPackageWarmupJob;

const BACKGROUND_JOB_QUEUE_NAME = 'background-jobs';

@Injectable()
export class BackgroundJobsService implements OnModuleDestroy {
  private readonly logger = new Logger(BackgroundJobsService.name);
  private readonly queue: Queue<BackgroundJobPayload> | null;
  private readonly worker: Worker<BackgroundJobPayload> | null;
  private readonly queueConnection: Redis | null;
  private readonly workerConnection: Redis | null;

  constructor(
    configService: ConfigService<AppEnvironment, true>,
    private readonly searchIndexService: SearchIndexService,
    private readonly downloadsService: DownloadsService,
  ) {
    const redisUrl = configService.get('REDIS_URL', { infer: true });
    const queueEnabled = configService.get('BACKGROUND_JOB_QUEUE_ENABLED', { infer: true });
    const consumerEnabled = configService.get('BACKGROUND_JOB_CONSUMER_ENABLED', { infer: true });

    if (redisUrl && queueEnabled) {
      this.queueConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
      this.queue = new Queue<BackgroundJobPayload>(BACKGROUND_JOB_QUEUE_NAME, {
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
        this.worker = new Worker<BackgroundJobPayload>(
          BACKGROUND_JOB_QUEUE_NAME,
          async (job) => {
            await this.processJob(job.data);
          },
          {
            connection: this.workerConnection,
          },
        );
        this.worker.on('error', (error) => {
          this.logger.warn(`Background job worker error: ${error.message}`);
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

  async enqueueSearchSync(familyId: string, operation: 'upsert' | 'remove'): Promise<void> {
    const payload: SearchSyncJob = {
      type: 'search_sync',
      familyId,
      operation,
    };

    if (await this.tryEnqueue(`search-sync:${operation}:${familyId}`, payload)) {
      return;
    }

    await this.processJob(payload);
  }

  async enqueueFamilyPackageWarmup(familyId: string): Promise<void> {
    const payload: FamilyPackageWarmupJob = {
      type: 'family_package_warmup',
      familyId,
    };

    if (await this.tryEnqueue(`family-package-warmup:${familyId}`, payload)) {
      return;
    }

    await this.processJob(payload);
  }

  private async tryEnqueue(jobName: string, payload: BackgroundJobPayload): Promise<boolean> {
    if (!this.queue) {
      return false;
    }

    try {
      await this.queue.add(jobName, payload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Background job queue unavailable, falling back to inline work: ${message}`);
      return false;
    }
  }

  private async processJob(payload: BackgroundJobPayload): Promise<void> {
    if (payload.type === 'search_sync') {
      if (payload.operation === 'remove') {
        await this.searchIndexService.removeFamilyById(payload.familyId);
        return;
      }

      await this.searchIndexService.syncFamilyById(payload.familyId);
      return;
    }

    await this.downloadsService.warmFamilyPackage(payload.familyId);
  }
}
