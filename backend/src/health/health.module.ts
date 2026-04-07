import { Module } from '@nestjs/common';

import { DependencyProbeService } from './services/dependency-probe.service';
import { HealthController } from './health.controller';
import { MetricsService } from './services/metrics.service';

@Module({
  controllers: [HealthController],
  providers: [DependencyProbeService, MetricsService],
})
export class HealthModule {}
