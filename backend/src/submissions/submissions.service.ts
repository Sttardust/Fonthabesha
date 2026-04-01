import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SubmissionStatus, UserRole } from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { PrismaService } from '../prisma/prisma.service';
import { summarizeUploadProcessingState } from '../uploads/upload-processing-state';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionMetadataDto } from './dto/update-submission-metadata.dto';
import { UpdateSubmissionStyleDto } from './dto/update-submission-style.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
  ) {}

  async getWorkflowSummary(): Promise<Record<SubmissionStatus, number>> {
    const grouped = await this.prisma.submission.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    const summary = Object.fromEntries(
      Object.values(SubmissionStatus).map((status) => [status, 0]),
    ) as Record<SubmissionStatus, number>;

    return grouped.reduce<Record<SubmissionStatus, number>>((accumulator, item) => {
      accumulator[item.status] = item._count._all;
      return accumulator;
    }, summary);
  }

  async listContributorSubmissions(request: AuthenticatedRequest) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);

    return this.prisma.submission.findMany({
      where: {
        ownerUserId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAm: true,
          },
        },
        declaredLicense: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async getContributorSubmissionDetail(request: AuthenticatedRequest, submissionId: string) {
    const submission = await this.getOwnedSubmissionWithDetails(request, submissionId);
    const uploadStatuses = submission.uploads.map((upload) => upload.processingStatus);
    const completedUploadCount = submission.uploads.filter(
      (upload) => upload.processingStatus === 'completed',
    ).length;
    const queuedUploadCount = submission.uploads.filter(
      (upload) => upload.processingStatus === 'queued',
    ).length;
    const processingUploadCount = submission.uploads.filter(
      (upload) => upload.processingStatus === 'processing',
    ).length;
    const processingWarnings = submission.uploads.flatMap(
      (upload) => (upload.processingWarningsJson as unknown[] | null) ?? [],
    );
    const blockingIssues = submission.uploads
      .filter((upload) => Boolean(upload.processingError))
      .map((upload) => ({
        uploadId: upload.id,
        message: upload.processingError,
      }));

    return {
      id: submission.id,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      submittedAt: submission.submittedAt,
      family: {
        id: submission.family.id,
        slug: submission.family.slug,
        nameEn: submission.family.nameEn,
        nameAm: submission.family.nameAm,
        nativeName: submission.family.nativeName,
        descriptionEn: submission.family.descriptionEn,
        descriptionAm: submission.family.descriptionAm,
        primaryLanguage: submission.family.primaryLanguage,
        supportsEthiopic: submission.family.supportsEthiopic,
        supportsLatin: submission.family.supportsLatin,
        category: submission.family.category,
      },
      declaredLicense: submission.declaredLicense,
      uploads: submission.uploads.map((upload) => ({
        id: upload.id,
        originalFilename: upload.originalFilename,
        mimeType: upload.mimeType,
        fileSizeBytes: Number(upload.fileSizeBytes ?? 0n),
        sha256: upload.sha256,
        metadata: upload.metadataJson,
        warnings: upload.processingWarningsJson ?? [],
        processingError: upload.processingError,
        processingStatus: upload.processingStatus,
        uploadedAt: upload.uploadedAt,
        processedAt: upload.processedAt,
      })),
      styles: submission.family.styles.map((style) => ({
        id: style.id,
        name: style.name,
        slug: style.slug,
        weightClass: style.weightClass,
        weightLabel: style.weightLabel,
        isItalic: style.isItalic,
        isDefault: style.isDefault,
        format: style.format,
        fileSizeBytes: Number(style.fileSizeBytes ?? 0n),
        sha256: style.sha256,
        status: style.status,
      })),
      analysis: {
        status: summarizeUploadProcessingState(uploadStatuses),
        completedUploadCount,
        queuedUploadCount,
        processingUploadCount,
        processingWarnings,
        blockingIssues,
      },
      permissions: {
        canEditMetadata: this.isContributorEditableStatus(submission.status),
        canEditStyles: this.isContributorEditableStatus(submission.status),
        canSubmitForReview:
          ['ready_for_submission', 'changes_requested'].includes(submission.status) &&
          completedUploadCount > 0,
      },
    };
  }

  async createDraftSubmission(
    request: AuthenticatedRequest,
    payload: CreateSubmissionDto,
    requestIp?: string,
  ) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);

    if (!user.legalFullName || !user.countryCode) {
      throw new BadRequestException(
        'Contributor profile is incomplete. legalFullName and countryCode are required before creating a submission.',
      );
    }

    const [activeTerms, declaredLicense, category] = await Promise.all([
      this.prisma.contributorTermsVersion.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          effectiveAt: 'desc',
        },
      }),
      this.prisma.license.findFirst({
        where: {
          id: payload.declaredLicenseId,
          isActive: true,
          allowsRedistribution: true,
        },
      }),
      payload.categoryId
        ? this.prisma.category.findUnique({
            where: {
              id: payload.categoryId,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!activeTerms) {
      throw new ServiceUnavailableException('No active contributor terms version is configured');
    }

    if (!declaredLicense) {
      throw new BadRequestException('The selected license is not available for contributor uploads');
    }

    if (payload.categoryId && !category) {
      throw new BadRequestException('The selected category does not exist');
    }

    if (payload.termsAcceptanceName.trim().toLowerCase() !== user.legalFullName.trim().toLowerCase()) {
      throw new BadRequestException('termsAcceptanceName must match the contributor legalFullName');
    }

    const slug = await this.generateUniqueFamilySlug(payload.slug ?? payload.familyNameEn);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const family = await tx.fontFamily.create({
        data: {
          slug,
          nameEn: payload.familyNameEn.trim(),
          nameAm: this.normalizeOptionalString(payload.familyNameAm),
          nativeName: this.normalizeOptionalString(payload.nativeName),
          descriptionEn: this.normalizeOptionalString(payload.descriptionEn),
          descriptionAm: this.normalizeOptionalString(payload.descriptionAm),
          script: 'Ethiopic',
          primaryLanguage: payload.primaryLanguage?.trim() || 'am',
          categoryId: category?.id ?? null,
          status: 'draft',
          supportsEthiopic: true,
          supportsLatin: payload.supportsLatin ?? false,
        },
      });

      const submission = await tx.submission.create({
        data: {
          familyId: family.id,
          ownerUserId: user.id,
          status: 'draft',
          declaredLicenseId: declaredLicense.id,
          ownershipEvidenceType: payload.ownershipEvidenceType,
          ownershipEvidenceValue: payload.ownershipEvidenceValue.trim(),
          contributorStatementText: payload.contributorStatementText.trim(),
          termsVersion: activeTerms.version,
          termsAcceptedAt: now,
          termsAcceptedIpHash: this.hashIpAddress(requestIp),
          termsAcceptanceName: payload.termsAcceptanceName.trim(),
          lastActionAt: now,
        },
      });

      return {
        id: submission.id,
        status: submission.status,
        family: {
          id: family.id,
          slug: family.slug,
          nameEn: family.nameEn,
          nameAm: family.nameAm,
        },
        declaredLicense: {
          id: declaredLicense.id,
          code: declaredLicense.code,
          name: declaredLicense.name,
        },
        termsVersion: activeTerms.version,
        createdAt: submission.createdAt,
      };
    });
  }

  async submitContributorSubmission(request: AuthenticatedRequest, submissionId: string) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        uploads: true,
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAm: true,
          },
        },
      },
    });

    if (!submission || submission.ownerUserId !== user.id) {
      throw new BadRequestException('Submission not found');
    }

    if (!['ready_for_submission', 'changes_requested'].includes(submission.status)) {
      throw new BadRequestException(
        'Submission must be ready_for_submission or changes_requested before submission',
      );
    }

    const completedUploadCount = submission.uploads.filter(
      (upload) => upload.processingStatus === 'completed',
    ).length;

    if (completedUploadCount === 0) {
      throw new BadRequestException('At least one completed upload is required before submission');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: 'needs_review',
          submittedAt: now,
          lastActionAt: now,
        },
      }),
      this.prisma.reviewEvent.create({
        data: {
          submissionId: submission.id,
          familyId: submission.familyId,
          actorUserId: user.id,
          action: 'submitted',
          metadataJson: {
            completedUploadCount,
          },
        },
      }),
    ]);

    return {
      id: submission.id,
      status: 'needs_review',
      submittedAt: now,
      family: submission.family,
      completedUploadCount,
    };
  }

  async updateContributorSubmissionMetadata(
    request: AuthenticatedRequest,
    submissionId: string,
    payload: UpdateSubmissionMetadataDto,
  ) {
    const submission = await this.getOwnedSubmissionWithDetails(request, submissionId);

    if (!this.isContributorEditableStatus(submission.status)) {
      throw new BadRequestException('Submission metadata can no longer be edited in the current status');
    }

    if (payload.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: payload.categoryId,
        },
      });

      if (!category) {
        throw new BadRequestException('The selected category does not exist');
      }
    }

    if (payload.slug && payload.slug !== submission.family.slug) {
      const existing = await this.prisma.fontFamily.findUnique({
        where: {
          slug: payload.slug,
        },
      });

      if (existing && existing.id !== submission.familyId) {
        throw new BadRequestException('The selected slug is already in use');
      }
    }

    const updatedFamily = await this.prisma.fontFamily.update({
      where: {
        id: submission.familyId,
      },
      data: {
        slug: payload.slug ?? undefined,
        nameEn: payload.familyNameEn?.trim() ?? undefined,
        nameAm: this.normalizePatchString(payload.familyNameAm),
        nativeName: this.normalizePatchString(payload.nativeName),
        descriptionEn: this.normalizePatchString(payload.descriptionEn),
        descriptionAm: this.normalizePatchString(payload.descriptionAm),
        primaryLanguage: this.normalizePatchString(payload.primaryLanguage),
        categoryId: payload.categoryId === undefined ? undefined : payload.categoryId,
        supportsLatin: payload.supportsLatin ?? undefined,
      },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameAm: true,
        nativeName: true,
        descriptionEn: true,
        descriptionAm: true,
        primaryLanguage: true,
        supportsLatin: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await this.prisma.submission.update({
      where: {
        id: submission.id,
      },
      data: {
        lastActionAt: new Date(),
      },
    });

    return {
      submissionId: submission.id,
      status: submission.status,
      family: updatedFamily,
    };
  }

  async updateContributorStyle(
    request: AuthenticatedRequest,
    submissionId: string,
    styleId: string,
    payload: UpdateSubmissionStyleDto,
  ) {
    const submission = await this.getOwnedSubmissionWithDetails(request, submissionId);

    if (!this.isContributorEditableStatus(submission.status)) {
      throw new BadRequestException('Submission styles can no longer be edited in the current status');
    }

    const style = submission.family.styles.find((candidate) => candidate.id === styleId);

    if (!style) {
      throw new NotFoundException('Style not found for this submission');
    }

    if (payload.slug && payload.slug !== style.slug) {
      const existingStyle = await this.prisma.fontStyle.findFirst({
        where: {
          familyId: submission.familyId,
          slug: payload.slug,
          id: {
            not: styleId,
          },
        },
      });

      if (existingStyle) {
        throw new BadRequestException('The selected style slug is already in use in this family');
      }
    }

    const normalizedIsDefault = payload.isDefault ?? false;

    if (payload.isDefault === true) {
      await this.prisma.fontStyle.updateMany({
        where: {
          familyId: submission.familyId,
          id: {
            not: styleId,
          },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updatedStyle = await this.prisma.fontStyle.update({
      where: {
        id: styleId,
      },
      data: {
        name: payload.name?.trim() ?? undefined,
        slug: payload.slug ?? undefined,
        weightClass: payload.weightClass ?? undefined,
        weightLabel: payload.weightLabel?.trim() ?? undefined,
        isItalic: payload.isItalic ?? undefined,
        isDefault: payload.isDefault === undefined ? undefined : normalizedIsDefault,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        weightClass: true,
        weightLabel: true,
        isItalic: true,
        isDefault: true,
        format: true,
        fileSizeBytes: true,
        sha256: true,
        status: true,
      },
    });

    await this.prisma.submission.update({
      where: {
        id: submission.id,
      },
      data: {
        lastActionAt: new Date(),
      },
    });

    return {
      submissionId: submission.id,
      status: submission.status,
      style: {
        ...updatedStyle,
        fileSizeBytes: Number(updatedStyle.fileSizeBytes ?? 0n),
      },
    };
  }

  private normalizeOptionalString(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizePatchString(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private hashIpAddress(requestIp: string | undefined): string | null {
    const normalizedIp = requestIp?.trim();

    if (!normalizedIp) {
      return null;
    }

    return createHash('sha256').update(normalizedIp).digest('hex');
  }

  private async generateUniqueFamilySlug(candidate: string): Promise<string> {
    const base = this.slugify(candidate);

    let index = 0;
    let nextSlug = base;

    while (await this.prisma.fontFamily.findUnique({ where: { slug: nextSlug } })) {
      index += 1;
      nextSlug = `${base}-${index}`;
    }

    return nextSlug;
  }

  private slugify(value: string): string {
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalized) {
      throw new BadRequestException('A slug or Latin familyNameEn is required to generate a family slug');
    }

    return normalized;
  }

  private async getOwnedSubmissionWithDetails(
    request: AuthenticatedRequest,
    submissionId: string,
  ) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
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
        },
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAm: true,
            nativeName: true,
            descriptionEn: true,
            descriptionAm: true,
            primaryLanguage: true,
            supportsEthiopic: true,
            supportsLatin: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            styles: {
              orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    if (!submission || submission.ownerUserId !== user.id) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  private isContributorEditableStatus(status: SubmissionStatus): boolean {
    return ['draft', 'uploaded', 'ready_for_submission', 'changes_requested', 'processing_failed'].includes(
      status,
    );
  }
}
