import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/fonthabesha';
    const adapter = new PrismaPg({ connectionString });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Intentionally do not force a database connection at startup.
    // This lets the API boot while local infrastructure is still starting
    // and keeps readiness, rather than process boot, responsible for reporting dependency state.
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
