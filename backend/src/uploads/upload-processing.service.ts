import { Injectable, Logger } from '@nestjs/common';
import { ReviewAction, SubmissionStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { FontInspectionService } from './font-inspection.service';
import { FontStyleSyncService } from './font-style-sync.service';
import { S3StorageService } from './s3-storage.service';
import { summarizeUploadProcessingState } from './upload-processing-state';
import { UploadsPolicyService } from './uploads-policy.service';

export type UploadProcessingTargetStatus = 'ready_for_submission' | 'needs_review';

export type ProcessUploadPayload = {
  uploadId: string;
  successSubmissionStatus: UploadProcessingTargetStatus;
  actorUserId?: string | null;
  failureNotesPrefix: string;
};

export type ProcessUploadResult = {
  upload: {
    id: string;
    processingStatus: 'queued' | 'processing' | 'completed' | 'failed';
    fileSizeBytes: number;
    mimeType: string | null;
    sha256: string | null;
    metadata?: unknown;
    warnings?: unknown;
    styleId?: string;
    processingError?: string | null;
  };
  submission: {
    id: string;
    status: SubmissionStatus;
  };
};

@Injectable()
export class UploadProcessingService {
  private readonly logger = new Logger(UploadProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fontInspection: FontInspectionService,
    private readonly fontStyleSync: FontStyleSyncService,
    private readonly uploadsPolicy: UploadsPolicyService,
    private readonly storageService: S3StorageService,
  ) {}

  async processUpload(payload: ProcessUploadPayload): Promise<ProcessUploadResult> {
    const upload = await this.prisma.upload.findUnique({
      where: {
        id: payload.uploadId,
      },
      include: {
        submission: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!upload) {
      throw new Error(`Upload ${payload.uploadId} was not found for processing`);
    }

    const startedAt = new Date();

    await this.prisma.upload.update({
      where: {
        id: upload.id,
      },
      data: {
        processingStatus: 'processing',
        processingError: null,
        processedAt: null,
      },
    });

    try {
      const objectMetadata = await this.storageService.getRawObjectMetadata(upload.storageKey);
      this.uploadsPolicy.validateStoredUpload({
        filename: upload.originalFilename,
        contentType: objectMetadata.contentType,
        contentLength: objectMetadata.contentLength,
      });
      const objectBuffer = await this.storageService.getRawObjectBuffer(upload.storageKey);
      const inspection = this.fontInspection.inspectFont(objectBuffer, upload.originalFilename);
      const styleSync = await this.fontStyleSync.syncFromInspection({
        familyId: upload.familyId,
        storageKey: upload.storageKey,
        originalFilename: upload.originalFilename,
        fileSizeBytes: BigInt(objectMetadata.contentLength),
        sha256: upload.sha256,
        inspection,
      });
      const warnings = [...inspection.warnings, ...styleSync.warnings];

      const { updatedUpload, submissionStatus } = await this.prisma.$transaction(async (tx) => {
        const updatedUpload = await tx.upload.update({
          where: {
            id: upload.id,
          },
          data: {
            fileSizeBytes: BigInt(objectMetadata.contentLength),
            mimeType: objectMetadata.contentType,
            metadataJson: inspection.metadata,
            processingWarningsJson: warnings,
            processingStatus: 'completed',
            processingError: null,
            processedAt: startedAt,
          },
        });
        const uploads = await tx.upload.findMany({
          where: {
            submissionId: upload.submissionId,
          },
          select: {
            processingStatus: true,
          },
        });
        const submissionStatus = this.deriveSubmissionStatus(
          uploads.map((item) => item.processingStatus),
          payload.successSubmissionStatus,
        );

        await tx.submission.update({
          where: {
            id: upload.submissionId,
          },
          data: {
            status: submissionStatus,
            lastActionAt: startedAt,
          },
        });

        return {
          updatedUpload,
          submissionStatus,
        };
      });

      return {
        upload: {
          id: updatedUpload.id,
          processingStatus: updatedUpload.processingStatus,
          fileSizeBytes: Number(updatedUpload.fileSizeBytes ?? 0n),
          mimeType: updatedUpload.mimeType,
          sha256: updatedUpload.sha256,
          metadata: updatedUpload.metadataJson,
          warnings: updatedUpload.processingWarningsJson ?? [],
          styleId: styleSync.styleId,
        },
        submission: {
          id: upload.submissionId,
          status: submissionStatus,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Upload processing failed for ${upload.id}: ${message}`);
      const failedAt = new Date();
      const objectMetadata = await this.storageService.getRawObjectMetadata(upload.storageKey).catch(() => null);

      const [, failedUpload] = await this.prisma.$transaction([
        this.prisma.submission.update({
          where: {
            id: upload.submissionId,
          },
          data: {
            status: 'processing_failed',
            lastActionAt: failedAt,
          },
        }),
        this.prisma.upload.update({
          where: {
            id: upload.id,
          },
          data: {
            fileSizeBytes:
              objectMetadata?.contentLength !== undefined
                ? BigInt(objectMetadata.contentLength)
                : upload.fileSizeBytes,
            mimeType: objectMetadata?.contentType ?? upload.mimeType,
            processingStatus: 'failed',
            processingError: message,
            processedAt: failedAt,
          },
        }),
        this.prisma.reviewEvent.create({
          data: {
            submissionId: upload.submissionId,
            familyId: upload.familyId,
            actorUserId: payload.actorUserId ?? null,
            action: ReviewAction.processing_failed,
            notes: `${payload.failureNotesPrefix}: ${message}`,
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

  private deriveSubmissionStatus(
    uploadStatuses: Array<'queued' | 'processing' | 'completed' | 'failed'>,
    successSubmissionStatus: UploadProcessingTargetStatus,
  ): SubmissionStatus {
    const summary = summarizeUploadProcessingState(uploadStatuses);

    if (summary === 'failed') {
      return 'processing_failed';
    }

    if (summary === 'completed') {
      return successSubmissionStatus;
    }

    return 'processing';
  }
}
