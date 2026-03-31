import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewAction, UserRole } from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { FontInspectionService } from './font-inspection.service';
import { FontStyleSyncService } from './font-style-sync.service';
import { InitUploadDto } from './dto/init-upload.dto';
import { S3StorageService } from './s3-storage.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly fontInspection: FontInspectionService,
    private readonly fontStyleSync: FontStyleSyncService,
    private readonly storageService: S3StorageService,
  ) {}

  async initUpload(userEmail: string | undefined, payload: InitUploadDto) {
    const user = await this.authContext.requireUserByEmail(userEmail, [UserRole.contributor]);
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: payload.submissionId,
      },
      include: {
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
          },
        },
      },
    });

    if (!submission || submission.ownerUserId !== user.id) {
      throw new NotFoundException('Submission not found');
    }

    if (!['draft', 'uploaded', 'ready_for_submission', 'changes_requested'].includes(submission.status)) {
      throw new BadRequestException('Uploads are not allowed for the current submission status');
    }

    const { uploadId, storageKey } = this.storageService.createRawUploadKey(
      submission.id,
      payload.filename,
    );
    const uploadUrl = await this.storageService.createRawUploadUrl(storageKey, payload.contentType);

    await this.prisma.$transaction([
      this.prisma.upload.create({
        data: {
          id: uploadId,
          uploaderId: user.id,
          submissionId: submission.id,
          familyId: submission.familyId,
          originalFilename: payload.filename.trim(),
          storageKey,
          mimeType: payload.contentType.trim(),
          processingStatus: 'queued',
        },
      }),
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: 'uploaded',
          lastActionAt: new Date(),
        },
      }),
    ]);

    return {
      uploadId,
      submission: {
        id: submission.id,
        status: 'uploaded',
        family: submission.family,
      },
      upload: {
        storageKey,
        filename: payload.filename.trim(),
        contentType: payload.contentType.trim(),
        expiresInSeconds: 15 * 60,
        method: 'PUT',
        url: uploadUrl,
      },
    };
  }

  async completeUpload(userEmail: string | undefined, payload: CompleteUploadDto) {
    const user = await this.authContext.requireUserByEmail(userEmail, [UserRole.contributor]);
    const upload = await this.prisma.upload.findUnique({
      where: {
        id: payload.uploadId,
      },
      include: {
        submission: true,
      },
    });

    if (!upload || upload.uploaderId !== user.id) {
      throw new NotFoundException('Upload not found');
    }

    const objectMetadata = await this.storageService.getRawObjectMetadata(upload.storageKey);
    const objectBuffer = await this.storageService.getRawObjectBuffer(upload.storageKey);

    try {
      const inspection = this.fontInspection.inspectFont(objectBuffer, upload.originalFilename);
      const styleSync = await this.fontStyleSync.syncFromInspection({
        familyId: upload.familyId,
        storageKey: upload.storageKey,
        originalFilename: upload.originalFilename,
        fileSizeBytes: BigInt(objectMetadata.contentLength),
        sha256: payload.sha256?.toLowerCase() ?? null,
        inspection,
      });
      const warnings = [...inspection.warnings, ...styleSync.warnings];

      const [, updatedUpload] = await this.prisma.$transaction([
        this.prisma.submission.update({
          where: {
            id: upload.submissionId,
          },
          data: {
            status: 'ready_for_submission',
            lastActionAt: new Date(),
          },
        }),
        this.prisma.upload.update({
          where: {
            id: upload.id,
          },
          data: {
            fileSizeBytes: BigInt(objectMetadata.contentLength),
            mimeType: objectMetadata.contentType,
            sha256: payload.sha256?.toLowerCase() ?? null,
            metadataJson: inspection.metadata,
            processingWarningsJson: warnings,
            processingStatus: 'completed',
            processingError: null,
            processedAt: new Date(),
          },
        }),
      ]);

      return {
        upload: {
          id: updatedUpload.id,
          processingStatus: updatedUpload.processingStatus,
          fileSizeBytes: Number(updatedUpload.fileSizeBytes ?? 0n),
          mimeType: updatedUpload.mimeType,
          sha256: updatedUpload.sha256,
          metadata: updatedUpload.metadataJson,
          warnings: updatedUpload.processingWarningsJson,
          styleId: styleSync.styleId,
        },
        submission: {
          id: upload.submissionId,
          status: 'ready_for_submission',
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const now = new Date();

      const [, failedUpload] = await this.prisma.$transaction([
        this.prisma.submission.update({
          where: {
            id: upload.submissionId,
          },
          data: {
            status: 'processing_failed',
            lastActionAt: now,
          },
        }),
        this.prisma.upload.update({
          where: {
            id: upload.id,
          },
          data: {
            fileSizeBytes: BigInt(objectMetadata.contentLength),
            mimeType: objectMetadata.contentType,
            sha256: payload.sha256?.toLowerCase() ?? null,
            processingStatus: 'failed',
            processingError: message,
            processedAt: now,
          },
        }),
        this.prisma.reviewEvent.create({
          data: {
            submissionId: upload.submissionId,
            familyId: upload.familyId,
            actorUserId: user.id,
            action: ReviewAction.processing_failed,
            notes: `Automatic font inspection failed: ${message}`,
            metadataJson: {
              uploadId: upload.id,
            },
          },
        }),
      ]);

      return {
        upload: {
          id: failedUpload.id,
          processingStatus: failedUpload.processingStatus,
          fileSizeBytes: Number(failedUpload.fileSizeBytes ?? 0n),
          mimeType: failedUpload.mimeType,
          sha256: failedUpload.sha256,
          processingError: failedUpload.processingError,
        },
        submission: {
          id: upload.submissionId,
          status: 'processing_failed',
        },
      };
    }
  }
}
