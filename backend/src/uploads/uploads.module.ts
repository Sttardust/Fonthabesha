import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FontInspectionService } from './font-inspection.service';
import { UploadProcessingQueueService } from './upload-processing-queue.service';
import { UploadProcessingService } from './upload-processing.service';
import { UploadsPolicyService } from './uploads-policy.service';
import { FontStyleSyncService } from './font-style-sync.service';
import { S3StorageService } from './s3-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    FontInspectionService,
    FontStyleSyncService,
    UploadsPolicyService,
    S3StorageService,
    UploadProcessingService,
    UploadProcessingQueueService,
    UploadsService,
  ],
  exports: [
    FontInspectionService,
    FontStyleSyncService,
    UploadsPolicyService,
    S3StorageService,
    UploadProcessingService,
    UploadProcessingQueueService,
    UploadsService,
  ],
})
export class UploadsModule {}
