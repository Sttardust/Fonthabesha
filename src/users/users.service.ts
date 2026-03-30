import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemSummary(): Promise<{ totalUsers: number; contributors: number }> {
    const [totalUsers, contributors] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          role: 'contributor',
        },
      }),
    ]);

    return {
      totalUsers,
      contributors,
    };
  }
}

