import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewAction, SubmissionStatus, UserRole } from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../uploads/s3-storage.service';
import { ReviewDecisionDto } from './dto/review-decision.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly storageService: S3StorageService,
  ) {}

  async listReviewQueue(userEmail: string | undefined, status?: string) {
    await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);

    const where: Prisma.SubmissionWhereInput = status
      ? { status: status as SubmissionStatus }
      : { status: { in: ['needs_review', 'processing_failed', 'changes_requested'] } };

    const submissions = await this.prisma.submission.findMany({
      where,
      orderBy: [{ submittedAt: 'asc' }, { updatedAt: 'asc' }],
      select: {
        id: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAm: true,
            publisher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        declaredLicense: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        uploads: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.SubmissionFindManyArgs);

    return submissions.map((submission) => ({
      submissionId: submission.id,
      familyId: submission.family.id,
      slug: submission.family.slug,
      name: {
        en: submission.family.nameEn,
        am: submission.family.nameAm,
      },
      status: submission.status,
      publisher: submission.family.publisher,
      submittedBy: submission.owner,
      declaredLicense: submission.declaredLicense,
      fileCount: submission.uploads.length,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    }));
  }

  async getReviewSummary(userEmail: string | undefined) {
    await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [needsReview, processingFailed, changesRequested, approved7d, rejected7d] =
      await Promise.all([
        this.prisma.submission.count({ where: { status: 'needs_review' } }),
        this.prisma.submission.count({ where: { status: 'processing_failed' } }),
        this.prisma.submission.count({ where: { status: 'changes_requested' } }),
        this.prisma.submission.count({
          where: {
            status: 'approved',
            reviewedAt: {
              gte: sevenDaysAgo,
            },
          },
        }),
        this.prisma.submission.count({
          where: {
            status: 'rejected',
            reviewedAt: {
              gte: sevenDaysAgo,
            },
          },
        }),
      ]);

    return {
      counts: {
        needsReview,
        processingFailed,
        changesRequested,
        approved7d,
        rejected7d,
      },
    };
  }

  async getReviewDetail(userEmail: string | undefined, submissionId: string) {
    await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);

    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
            legalFullName: true,
            countryCode: true,
            organizationName: true,
            phoneNumber: true,
          },
        },
        family: {
          select: {
            id: true,
            slug: true,
            status: true,
            nameEn: true,
            nameAm: true,
            descriptionEn: true,
            descriptionAm: true,
            script: true,
            primaryLanguage: true,
            supportsEthiopic: true,
            supportsLatin: true,
            publishedAt: true,
            publisher: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        declaredLicense: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        uploads: {
          orderBy: {
            uploadedAt: 'asc',
          },
          select: {
            id: true,
            originalFilename: true,
            storageKey: true,
            mimeType: true,
            fileSizeBytes: true,
            sha256: true,
            processingStatus: true,
            uploadedAt: true,
            processedAt: true,
            uploader: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        reviewEvents: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            action: true,
            notes: true,
            metadataJson: true,
            createdAt: true,
            actorUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const processingStatus = submission.uploads.some((upload) => upload.processingStatus === 'failed')
      ? 'failed'
      : submission.uploads.every((upload) => upload.processingStatus === 'completed')
        ? 'completed'
        : submission.uploads.some((upload) => upload.processingStatus === 'processing')
          ? 'processing'
          : 'queued';

    return {
      family: {
        id: submission.family.id,
        slug: submission.family.slug,
        status: submission.status,
        name: {
          en: submission.family.nameEn,
          am: submission.family.nameAm,
        },
        description: {
          en: submission.family.descriptionEn,
          am: submission.family.descriptionAm,
        },
        publisher: submission.family.publisher,
        category: submission.family.category,
        script: submission.family.script,
        primaryLanguage: submission.family.primaryLanguage,
        supportsEthiopic: submission.family.supportsEthiopic,
        supportsLatin: submission.family.supportsLatin,
        publishedAt: submission.family.publishedAt,
      },
      submissionId: submission.id,
      submission: {
        submittedBy: submission.owner,
        submittedAt: submission.submittedAt,
        declaredLicense: submission.declaredLicense,
        ownershipEvidence: {
          type: submission.ownershipEvidenceType,
          value: submission.ownershipEvidenceValue,
        },
        contributorAssent: {
          termsVersion: submission.termsVersion,
          acceptedAt: submission.termsAcceptedAt,
          acceptanceName: submission.termsAcceptanceName,
        },
      },
      processing: {
        status: processingStatus,
        warnings: [],
        blockingIssues: [],
      },
      uploads: submission.uploads.map((upload) => ({
        id: upload.id,
        originalFilename: upload.originalFilename,
        storageKey: upload.storageKey,
        mimeType: upload.mimeType,
        fileSizeBytes: Number(upload.fileSizeBytes ?? 0n),
        sha256: upload.sha256,
        processingStatus: upload.processingStatus,
        uploadedAt: upload.uploadedAt,
        processedAt: upload.processedAt,
        uploader: upload.uploader,
      })),
      reviewHistory: submission.reviewEvents,
      permissions: {
        canApprove: submission.status === 'needs_review',
        canReject: submission.status === 'needs_review',
        canRequestChanges: submission.status === 'needs_review',
      },
    };
  }

  async approveSubmission(
    userEmail: string | undefined,
    submissionId: string,
    payload: ReviewDecisionDto,
  ) {
    const actor = await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);
    return this.applyReviewDecision(actor.id, submissionId, 'approved', payload.notes);
  }

  async rejectSubmission(
    userEmail: string | undefined,
    submissionId: string,
    payload: ReviewDecisionDto,
  ) {
    const actor = await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);
    return this.applyReviewDecision(actor.id, submissionId, 'rejected', payload.notes);
  }

  async requestChanges(
    userEmail: string | undefined,
    submissionId: string,
    payload: ReviewDecisionDto,
  ) {
    const actor = await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);

    if (!payload.notes?.trim()) {
      throw new BadRequestException('notes are required when requesting changes');
    }

    return this.applyReviewDecision(actor.id, submissionId, 'request_changes', payload.notes);
  }

  async directUploadToSubmission(
    userEmail: string | undefined,
    submissionId: string,
    file:
      | {
          originalname: string;
          mimetype: string;
          buffer: Buffer;
          size: number;
        }
      | undefined,
    notes?: string,
  ) {
    const actor = await this.authContext.requireUserByEmail(userEmail, [UserRole.admin, UserRole.reviewer]);

    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
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

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (['approved', 'rejected', 'archived'].includes(submission.status)) {
      throw new BadRequestException('Direct upload is not allowed for the current submission status');
    }

    const { uploadId, storageKey } = this.storageService.createRawUploadKey(submission.id, file.originalname);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    await this.storageService.putRawObject(storageKey, file.buffer, file.mimetype);

    const nextStatus = 'needs_review';

    const [createdUpload] = await this.prisma.$transaction([
      this.prisma.upload.create({
        data: {
          id: uploadId,
          uploaderId: actor.id,
          submissionId: submission.id,
          familyId: submission.familyId,
          originalFilename: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          fileSizeBytes: BigInt(file.size),
          sha256,
          processingStatus: 'completed',
          processedAt: new Date(),
        },
      }),
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: nextStatus,
          lastActionAt: new Date(),
        },
      }),
      this.prisma.reviewEvent.create({
        data: {
          submissionId: submission.id,
          familyId: submission.familyId,
          actorUserId: actor.id,
          action: ReviewAction.metadata_updated,
          notes: notes?.trim() || 'Admin uploaded a file directly from local storage',
          metadataJson: {
            uploadId,
            originalFilename: file.originalname,
          },
        },
      }),
    ]);

    return {
      submission: {
        id: submission.id,
        status: nextStatus,
        family: submission.family,
      },
      upload: {
        id: createdUpload.id,
        originalFilename: createdUpload.originalFilename,
        storageKey: createdUpload.storageKey,
        mimeType: createdUpload.mimeType,
        fileSizeBytes: Number(createdUpload.fileSizeBytes ?? 0n),
        sha256: createdUpload.sha256,
      },
    };
  }

  private async applyReviewDecision(
    actorUserId: string,
    submissionId: string,
    action: 'approved' | 'rejected' | 'request_changes',
    notes?: string,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        family: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'needs_review') {
      throw new BadRequestException('Submission must be in needs_review before a review decision can be applied');
    }

    if (action !== 'approved' && !notes?.trim()) {
      throw new BadRequestException('notes are required for this decision');
    }

    const now = new Date();
    const nextSubmissionStatus =
      action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'changes_requested';

    const familyUpdate =
      action === 'approved'
        ? {
            status: 'approved' as const,
            licenseId: submission.declaredLicenseId,
            publishedAt: now,
          }
        : {
            status: 'draft' as const,
            publishedAt: null,
          };

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: nextSubmissionStatus,
          reviewedAt: now,
          reviewedByUserId: actorUserId,
          lastActionAt: now,
        },
      }),
      this.prisma.fontFamily.update({
        where: {
          id: submission.familyId,
        },
        data: familyUpdate,
      }),
      this.prisma.reviewEvent.create({
        data: {
          submissionId: submission.id,
          familyId: submission.familyId,
          actorUserId,
          action,
          notes: notes?.trim() || null,
        },
      }),
    ]);

    return {
      submissionId: submission.id,
      familyId: submission.familyId,
      status: nextSubmissionStatus,
      publishedAt: action === 'approved' ? now : null,
    };
  }
}
