import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { S3StorageService } from './s3-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [S3StorageService, UploadsService],
  exports: [S3StorageService, UploadsService],
})
export class UploadsModule {}
