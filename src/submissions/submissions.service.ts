import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SubmissionStatus, UserRole } from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

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

  async listContributorSubmissions(userEmail: string | undefined) {
    const user = await this.authContext.requireUserByEmail(userEmail, [UserRole.contributor]);

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

  async createDraftSubmission(
    userEmail: string | undefined,
    payload: CreateSubmissionDto,
    requestIp?: string,
  ) {
    const user = await this.authContext.requireUserByEmail(userEmail, [UserRole.contributor]);

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

  private normalizeOptionalString(value: string | undefined): string | null {
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
}
