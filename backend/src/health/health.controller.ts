import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { DependencyProbeService } from './services/dependency-probe.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dependencyProbeService: DependencyProbeService) {}

  @Get('live')
  getLiveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{
    status: 'ok' | 'error';
    checks: Array<{ dependency: string; status: 'up' | 'down'; details?: string }>;
  }> {
    const checks = await this.dependencyProbeService.runChecks();
    const hasFailure = checks.some((check) => check.status === 'down');

    if (hasFailure) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
      });
    }

    return {
      status: 'ok',
      checks,
    };
  }
}

