import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FontInspectionService } from './font-inspection.service';
import { FontStyleSyncService } from './font-style-sync.service';
import { S3StorageService } from './s3-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [FontInspectionService, FontStyleSyncService, S3StorageService, UploadsService],
  exports: [FontInspectionService, FontStyleSyncService, S3StorageService, UploadsService],
})
export class UploadsModule {}
