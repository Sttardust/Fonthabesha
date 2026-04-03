import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmissionStatus } from '@prisma/client';

import type { AppEnvironment } from '../../shared/config/app-env';
import { PrismaService } from '../../prisma/prisma.service';
import { DependencyProbeService } from './dependency-probe.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly dependencyProbeService: DependencyProbeService,
  ) {}

  async renderPrometheusMetrics(): Promise<string> {
    const [dependencyChecks, submissionCounts] = await Promise.all([
      this.dependencyProbeService.runChecks(),
      this.prisma.submission.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const submissionCountMap = Object.fromEntries(
      Object.values(SubmissionStatus).map((status) => [status, 0]),
    ) as Record<SubmissionStatus, number>;

    submissionCounts.forEach((entry) => {
      submissionCountMap[entry.status] = entry._count._all;
    });

    const memoryUsage = process.memoryUsage();
    const lines = [
      '# HELP fonthabesha_app_info Static application metadata.',
      '# TYPE fonthabesha_app_info gauge',
      `fonthabesha_app_info{node_env="${this.escapeLabelValue(
        this.configService.get('NODE_ENV', { infer: true }),
      )}"} 1`,
      '# HELP fonthabesha_process_uptime_seconds Process uptime in seconds.',
      '# TYPE fonthabesha_process_uptime_seconds gauge',
      `fonthabesha_process_uptime_seconds ${process.uptime().toFixed(3)}`,
      '# HELP fonthabesha_process_resident_memory_bytes Resident set size in bytes.',
      '# TYPE fonthabesha_process_resident_memory_bytes gauge',
      `fonthabesha_process_resident_memory_bytes ${memoryUsage.rss}`,
      '# HELP fonthabesha_process_heap_used_bytes V8 heap used in bytes.',
      '# TYPE fonthabesha_process_heap_used_bytes gauge',
      `fonthabesha_process_heap_used_bytes ${memoryUsage.heapUsed}`,
      '# HELP fonthabesha_process_heap_total_bytes V8 heap total in bytes.',
      '# TYPE fonthabesha_process_heap_total_bytes gauge',
      `fonthabesha_process_heap_total_bytes ${memoryUsage.heapTotal}`,
      '# HELP fonthabesha_dependency_up Dependency readiness probe result.',
      '# TYPE fonthabesha_dependency_up gauge',
      ...dependencyChecks.map(
        (check) =>
          `fonthabesha_dependency_up{dependency="${this.escapeLabelValue(check.dependency)}"} ${
            check.status === 'up' ? 1 : 0
          }`,
      ),
      '# HELP fonthabesha_submission_count Number of submissions by workflow status.',
      '# TYPE fonthabesha_submission_count gauge',
      ...Object.entries(submissionCountMap).map(
        ([status, count]) =>
          `fonthabesha_submission_count{status="${this.escapeLabelValue(status)}"} ${count}`,
      ),
    ];

    return `${lines.join('\n')}\n`;
  }

  private escapeLabelValue(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  }
}
