import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { InitUploadDto } from './dto/init-upload.dto';
import { UploadProcessingQueueService } from './upload-processing-queue.service';
import { UploadsPolicyService } from './uploads-policy.service';
import { S3StorageService } from './s3-storage.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly uploadProcessingQueue: UploadProcessingQueueService,
    private readonly uploadsPolicy: UploadsPolicyService,
    private readonly storageService: S3StorageService,
  ) {}

  async initUpload(request: AuthenticatedRequest, payload: InitUploadDto) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: payload.submissionId,
      },
      include: {
        uploads: {
          select: {
            id: true,
          },
        },
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

    await this.uploadsPolicy.assertContributorInitRateLimit(user.id);
    this.uploadsPolicy.assertSubmissionUploadCapacity(submission.uploads.length);
    this.uploadsPolicy.validateDeclaredUpload(payload.filename, payload.contentType);

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

  async completeUpload(request: AuthenticatedRequest, payload: CompleteUploadDto) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);
    await this.uploadsPolicy.assertContributorCompleteRateLimit(user.id);

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
    this.uploadsPolicy.validateStoredUpload({
      filename: upload.originalFilename,
      contentType: objectMetadata.contentType,
      contentLength: objectMetadata.contentLength,
    });
    const now = new Date();
    const normalizedSha = payload.sha256?.toLowerCase() ?? null;

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: {
          id: upload.submissionId,
        },
        data: {
          status: 'processing',
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
          sha256: normalizedSha,
          processingStatus: 'queued',
          processingError: null,
          processedAt: null,
        },
      }),
    ]);

    const scheduled = await this.uploadProcessingQueue.scheduleUploadProcessing({
      uploadId: upload.id,
      successSubmissionStatus: 'ready_for_submission',
      actorUserId: user.id,
      failureNotesPrefix: 'Automatic font inspection failed',
    });

    if (!scheduled.queued) {
      return scheduled.result;
    }

    return {
      upload: {
        id: upload.id,
        processingStatus: 'queued',
        fileSizeBytes: objectMetadata.contentLength,
        mimeType: objectMetadata.contentType,
        sha256: normalizedSha,
      },
      submission: {
        id: upload.submissionId,
        status: 'processing',
      },
    };
  }
}
