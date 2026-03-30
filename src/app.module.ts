import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { LicensesModule } from './licenses/licenses.module';
import { PrismaModule } from './prisma/prisma.module';
import { validateEnvironment } from './shared/config/app-env';
import { SubmissionsModule } from './submissions/submissions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    LicensesModule,
    SubmissionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
