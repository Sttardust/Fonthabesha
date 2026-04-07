import { Injectable } from '@nestjs/common';
import { OwnershipEvidenceType, UserRole } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContextService } from '../auth/auth-context.service';

@Injectable()
export class ContributorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
  ) {}

  async getComplianceRequirements(request: AuthenticatedRequest) {
    const user = await this.authContext.requireUserFromRequest(request, [UserRole.contributor]);

    const [activeTerms, licenses] = await Promise.all([
      this.prisma.contributorTermsVersion.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          effectiveAt: 'desc',
        },
      }),
      this.prisma.license.findMany({
        where: {
          isActive: true,
          allowsRedistribution: true,
        },
        orderBy: {
          code: 'asc',
        },
        select: {
          id: true,
          code: true,
          name: true,
          allowsCommercialUse: true,
          requiresAttribution: true,
        },
      }),
    ]);

    const missingProfileFields = [
      !user.legalFullName ? 'legalFullName' : null,
      !user.countryCode ? 'countryCode' : null,
    ].filter((field): field is string => Boolean(field));

    return {
      contributor: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        legalFullName: user.legalFullName,
        countryCode: user.countryCode,
        organizationName: user.organizationName,
        phoneNumber: user.phoneNumber,
      },
      profileComplete: missingProfileFields.length === 0,
      missingProfileFields,
      activeTermsVersion: activeTerms
        ? {
            version: activeTerms.version,
            title: activeTerms.title,
            documentUrl: activeTerms.documentUrl,
            effectiveAt: activeTerms.effectiveAt,
          }
        : null,
      licenseOptions: licenses,
      ownershipEvidenceTypes: Object.values(OwnershipEvidenceType),
      requirements: {
        requiresOwnershipEvidence: true,
        requiresTypedNameAcceptance: true,
        termsAcceptedPerSubmission: true,
      },
    };
  }
}
