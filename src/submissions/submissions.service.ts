import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkflowSummary(): Promise<Record<string, number>> {
    const grouped = await this.prisma.submission.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    return grouped.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.status] = item._count._all;
      return accumulator;
    }, {});
  }
}

