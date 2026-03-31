import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module';
import { AssetsModule } from './assets/assets.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContributorModule } from './contributor/contributor.module';
import { DownloadsModule } from './downloads/downloads.module';
import { HealthModule } from './health/health.module';
import { LicensesModule } from './licenses/licenses.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';
import { validateEnvironment } from './shared/config/app-env';
import { SubmissionsModule } from './submissions/submissions.module';
import { UploadsModule } from './uploads/uploads.module';
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
    AdminModule,
    AssetsModule,
    AuthModule,
    CatalogModule,
    ContributorModule,
    DownloadsModule,
    HealthModule,
    UsersModule,
    LicensesModule,
    MailModule,
    SubmissionsModule,
    SearchModule,
    UploadsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
