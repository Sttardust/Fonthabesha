import { Module } from '@nestjs/common';

import { DependencyProbeService } from './services/dependency-probe.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [DependencyProbeService],
})
export class HealthModule {}

