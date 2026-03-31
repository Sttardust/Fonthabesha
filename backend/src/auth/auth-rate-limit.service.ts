import { createHash } from 'node:crypto';

import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppEnvironment } from '../shared/config/app-env';

type MemoryRateLimitRecord = {
  count: number;
  expiresAt: number;
};

@Injectable()
export class AuthRateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthRateLimitService.name);
  private readonly memoryStore = new Map<string, MemoryRateLimitRecord>();
  private readonly redis: Redis | null;
  private redisUsable = true;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {
    const redisUrl = this.configService.get('REDIS_URL', { infer: true });

    this.redis = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        })
      : null;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
    }
  }

  async consume(args: {
    scope: string;
    identifier: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{ currentCount: number; remaining: number; retryAfterSeconds: number }> {
    const key = this.buildKey(args.scope, args.identifier);

    if (this.redis && this.redisUsable) {
      try {
        await this.ensureRedisConnection();
        const count = await this.redis.incr(key);

        if (count === 1) {
          await this.redis.expire(key, args.windowSeconds);
        }

        const ttl = await this.redis.ttl(key);
        return {
          currentCount: count,
          remaining: Math.max(args.limit - count, 0),
          retryAfterSeconds: ttl > 0 ? ttl : args.windowSeconds,
        };
      } catch (error) {
        this.redisUsable = false;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Falling back to in-memory auth rate limiting: ${message}`);
      }
    }

    return this.consumeInMemory(key, args.limit, args.windowSeconds);
  }

  private async ensureRedisConnection(): Promise<void> {
    if (!this.redis || this.redis.status === 'ready') {
      return;
    }

    if (this.redis.status === 'connecting' || this.redis.status === 'connect') {
      await new Promise<void>((resolve, reject) => {
        const cleanup = (): void => {
          this.redis?.off('ready', handleReady);
          this.redis?.off('error', handleError);
        };

        const handleReady = (): void => {
          cleanup();
          resolve();
        };

        const handleError = (error: Error): void => {
          cleanup();
          reject(error);
        };

        this.redis?.once('ready', handleReady);
        this.redis?.once('error', handleError);
      });
      return;
    }

    await this.redis.connect();
  }

  private consumeInMemory(
    key: string,
    limit: number,
    windowSeconds: number,
  ): { currentCount: number; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const existing = this.memoryStore.get(key);

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowSeconds * 1000;
      this.memoryStore.set(key, {
        count: 1,
        expiresAt,
      });

      return {
        currentCount: 1,
        remaining: Math.max(limit - 1, 0),
        retryAfterSeconds: windowSeconds,
      };
    }

    existing.count += 1;
    this.memoryStore.set(key, existing);

    return {
      currentCount: existing.count,
      remaining: Math.max(limit - existing.count, 0),
      retryAfterSeconds: Math.max(Math.ceil((existing.expiresAt - now) / 1000), 1),
    };
  }

  private buildKey(scope: string, identifier: string): string {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const digest = createHash('sha256').update(normalizedIdentifier).digest('hex');
    return `auth-rate-limit:${scope}:${digest}`;
  }
}
