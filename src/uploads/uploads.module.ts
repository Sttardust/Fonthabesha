import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FontInspectionService } from './font-inspection.service';
import { S3StorageService } from './s3-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [FontInspectionService, S3StorageService, UploadsService],
  exports: [FontInspectionService, S3StorageService, UploadsService],
})
export class UploadsModule {}
