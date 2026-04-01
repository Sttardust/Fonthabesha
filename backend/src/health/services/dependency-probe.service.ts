import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';

import type { AppEnvironment } from '../../shared/config/app-env';

type ProbeResult = {
  dependency: string;
  status: 'up' | 'down';
  details?: string;
};

@Injectable()
export class DependencyProbeService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {}

  async runChecks(): Promise<ProbeResult[]> {
    const databaseUrl = this.configService.get('DATABASE_URL', { infer: true });
    const redisUrl = this.configService.get('REDIS_URL', { infer: true });
    const meilisearchUrl = this.configService.get('MEILISEARCH_URL', { infer: true });
    const s3Endpoint = this.configService.get('S3_ENDPOINT', { infer: true });

    const targets = [
      this.fromUrl('postgres', databaseUrl),
      this.fromUrl('redis', redisUrl),
      this.fromUrl('meilisearch', meilisearchUrl),
      this.fromUrl('s3', s3Endpoint),
    ];

    return Promise.all(targets.map((target) => this.probeTcp(target.name, target.host, target.port)));
  }

  private fromUrl(name: string, value: string): { name: string; host: string; port: number } {
    const url = new URL(value);
    const isSecure = url.protocol.endsWith('s');
    const defaultPort = url.protocol.startsWith('postgres')
      ? 5432
      : url.protocol.startsWith('redis')
        ? 6379
        : isSecure
          ? 443
          : 80;

    return {
      name,
      host: url.hostname,
      port: url.port ? Number(url.port) : defaultPort,
    };
  }

  private probeTcp(name: string, host: string, port: number): Promise<ProbeResult> {
    return new Promise((resolve) => {
      const socket = new Socket();
      let settled = false;

      socket.unref();

      const finish = (result: ProbeResult): void => {
        if (settled) {
          return;
        }

        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(1500);

      socket.once('connect', () => {
        finish({ dependency: name, status: 'up' });
      });

      socket.once('timeout', () => {
        finish({
          dependency: name,
          status: 'down',
          details: `Timed out connecting to ${host}:${port}`,
        });
      });

      socket.once('error', (error: Error) => {
        finish({
          dependency: name,
          status: 'down',
          details: error.message || `Unable to connect to ${host}:${port}`,
        });
      });

      socket.connect(port, host);
    });
  }
}
