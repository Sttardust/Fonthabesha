import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { FontInspectionResult, FontInspectionWarning } from './font-inspection.service';

@Injectable()
export class FontStyleSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncFromInspection(args: {
    familyId: string;
    storageKey: string;
    originalFilename: string;
    fileSizeBytes: bigint;
    sha256: string | null;
    inspection: FontInspectionResult;
  }): Promise<{ styleId: string; warnings: FontInspectionWarning[] }> {
    const duplicateWarnings = await this.buildDuplicateWarnings(args.familyId, args.sha256);
    const styleSlug = this.slugify(args.inspection.metadata.styleName);
    const currentStyleCount = await this.prisma.fontStyle.count({
      where: {
        familyId: args.familyId,
      },
    });

    const style = await this.prisma.fontStyle.upsert({
      where: {
        familyId_slug: {
          familyId: args.familyId,
          slug: styleSlug,
        },
      },
      update: {
        name: args.inspection.metadata.styleName,
        weightClass: args.inspection.metadata.weightClass,
        weightLabel: args.inspection.metadata.weightLabel,
        isItalic: args.inspection.metadata.isItalic,
        isDefault:
          currentStyleCount === 1
            ? undefined
            : this.isDefaultStyle(args.inspection.metadata.weightClass, args.inspection.metadata.isItalic),
        fileKey: args.storageKey,
        format: args.inspection.metadata.fileFormat,
        fileSizeBytes: args.fileSizeBytes,
        sha256: args.sha256,
        metricsJson: {
          unitsPerEm: args.inspection.metadata.unitsPerEm,
          ascender: args.inspection.metadata.ascender,
          descender: args.inspection.metadata.descender,
          glyphCount: args.inspection.metadata.glyphCount,
        },
        glyphCoverageJson: {
          supportedUnicodeRanges: args.inspection.metadata.supportedUnicodeRanges,
        },
      },
      create: {
        familyId: args.familyId,
        name: args.inspection.metadata.styleName,
        slug: styleSlug,
        weightClass: args.inspection.metadata.weightClass,
        weightLabel: args.inspection.metadata.weightLabel,
        isItalic: args.inspection.metadata.isItalic,
        isDefault:
          currentStyleCount === 0 ||
          this.isDefaultStyle(args.inspection.metadata.weightClass, args.inspection.metadata.isItalic),
        fileKey: args.storageKey,
        format: args.inspection.metadata.fileFormat,
        fileSizeBytes: args.fileSizeBytes,
        sha256: args.sha256,
        metricsJson: {
          unitsPerEm: args.inspection.metadata.unitsPerEm,
          ascender: args.inspection.metadata.ascender,
          descender: args.inspection.metadata.descender,
          glyphCount: args.inspection.metadata.glyphCount,
        },
        glyphCoverageJson: {
          supportedUnicodeRanges: args.inspection.metadata.supportedUnicodeRanges,
        },
      },
    });

    return {
      styleId: style.id,
      warnings: duplicateWarnings,
    };
  }

  private async buildDuplicateWarnings(
    familyId: string,
    sha256: string | null,
  ): Promise<FontInspectionWarning[]> {
    if (!sha256) {
      return [];
    }

    const [matchingUploads, matchingStyles] = await Promise.all([
      this.prisma.upload.findMany({
        where: {
          sha256,
          familyId: {
            not: familyId,
          },
        },
        select: {
          id: true,
          familyId: true,
        },
        take: 3,
      }),
      this.prisma.fontStyle.findMany({
        where: {
          sha256,
          familyId: {
            not: familyId,
          },
        },
        select: {
          id: true,
          familyId: true,
        },
        take: 3,
      }),
    ]);

    if (matchingUploads.length === 0 && matchingStyles.length === 0) {
      return [];
    }

    return [
      {
        code: 'DUPLICATE_FILE_HASH_DETECTED',
        message: 'This file hash already exists in another family and should be reviewed for duplication.',
        severity: 'warning',
      },
    ];
  }

  private slugify(value: string): string {
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'regular';
  }

  private isDefaultStyle(weightClass: number, isItalic: boolean): boolean {
    return weightClass === 400 && !isItalic;
  }
}
