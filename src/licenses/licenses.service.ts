import { Injectable } from '@nestjs/common';
import type { License } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<
    Array<Pick<License, 'id' | 'code' | 'name' | 'allowsRedistribution' | 'allowsCommercialUse'>>
  > {
    return this.prisma.license.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        allowsRedistribution: true,
        allowsCommercialUse: true,
      },
    });
  }
}

