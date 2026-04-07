import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Injectable, NotFoundException } from '@nestjs/common';
import { EventSource, Prisma } from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../uploads/s3-storage.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class DownloadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly storageService: S3StorageService,
  ) {}

  async issueFamilyDownload(
    request: AuthenticatedRequest,
    familyId: string,
  ) {
    const user = await this.authContext.findActiveUserFromRequest(request);
    const family = await this.getApprovedFamilyPackageData(familyId);
    const packageKey = await this.ensureFamilyPackage(family);

    const download = await this.storageService.createRawDownloadUrl(
      packageKey,
      `${this.sanitizeFilename(family.slug || family.nameEn || 'font-family')}.zip`,
    );

    await this.recordDownloadEvent({
      familyId: family.id,
      styleId: null,
      userId: user?.id ?? null,
      source: EventSource.public_api,
      request,
    });

    return {
      downloadUrl: download.url,
      expiresAt: download.expiresAt,
    };
  }

  async warmFamilyPackage(
    familyId: string,
  ): Promise<{ familyId: string; packageKey: string }> {
    const family = await this.getApprovedFamilyPackageData(familyId);
    const packageKey = await this.ensureFamilyPackage(family);

    return {
      familyId: family.id,
      packageKey,
    };
  }

  async issueStyleDownload(
    request: AuthenticatedRequest,
    styleId: string,
  ) {
    const user = await this.authContext.findActiveUserFromRequest(request);
    const style = await this.prisma.fontStyle.findUnique({
      where: {
        id: styleId,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        format: true,
        fileKey: true,
        status: true,
        family: {
          select: {
            id: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (
      !style ||
      style.status !== 'approved' ||
      style.family.status !== 'approved' ||
      !style.fileKey
    ) {
      throw new NotFoundException('Approved style download not found');
    }

    const extension = this.resolveStyleExtension(style.format, style.fileKey);
    const download = await this.storageService.createRawDownloadUrl(
      style.fileKey,
      `${this.sanitizeFilename(style.family.slug)}-${this.sanitizeFilename(style.slug || style.name)}.${extension}`,
    );

    await this.recordDownloadEvent({
      familyId: style.family.id,
      styleId: style.id,
      userId: user?.id ?? null,
      source: EventSource.public_api,
      request,
    });

    return {
      downloadUrl: download.url,
      expiresAt: download.expiresAt,
    };
  }

  private async buildFamilyPackageZip(
    familySlug: string,
    styles: Array<{
      id: string;
      slug: string;
      name: string;
      format: string | null;
      fileKey: string | null;
    }>,
  ): Promise<Buffer> {
    const tempDir = await mkdtemp(join(tmpdir(), 'fonthabesha-family-package-'));
    const archivePath = join(tempDir, `${this.sanitizeFilename(familySlug || 'font-family')}.zip`);
    const filePaths: string[] = [];
    const usedNames = new Set<string>();

    try {
      for (const style of styles) {
        if (!style.fileKey) {
          continue;
        }

        const fileBuffer = await this.storageService.getRawObjectBuffer(style.fileKey);
        const extension = this.resolveStyleExtension(style.format, style.fileKey);
        const archiveName = this.ensureUniqueFilename(
          `${this.sanitizeFilename(familySlug || 'font-family')}-${this.sanitizeFilename(style.slug || style.name)}.${extension}`,
          usedNames,
        );
        const localPath = join(tempDir, archiveName);
        await writeFile(localPath, fileBuffer);
        filePaths.push(localPath);
      }

      if (filePaths.length === 0) {
        throw new NotFoundException('No approved style files are available for packaging');
      }

      await execFileAsync('zip', ['-q', '-j', archivePath, ...filePaths]);

      return await readFile(archivePath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async getApprovedFamilyPackageData(familyId: string) {
    const family = await this.prisma.fontFamily.findUnique({
      where: {
        id: familyId,
        status: 'approved',
      },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        styles: {
          where: {
            status: 'approved',
            fileKey: {
              not: null,
            },
          },
          orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            slug: true,
            name: true,
            format: true,
            fileKey: true,
            sha256: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!family || family.styles.length === 0) {
      throw new NotFoundException('Approved family package not found');
    }

    return family;
  }

  private async ensureFamilyPackage(family: {
    id: string;
    slug: string;
    nameEn: string;
    styles: Array<{
      id: string;
      slug: string;
      name: string;
      format: string | null;
      fileKey: string | null;
      sha256: string | null;
      updatedAt: Date;
    }>;
  }): Promise<string> {
    const packageKey = this.buildFamilyPackageKey(
      family.id,
      family.slug,
      family.styles.map((style) => ({
        id: style.id,
        sha256: style.sha256,
        updatedAt: style.updatedAt,
      })),
    );

    if (!(await this.storageService.rawObjectExists(packageKey))) {
      const packageBuffer = await this.buildFamilyPackageZip(family.slug, family.styles);
      await this.storageService.putRawObject(packageKey, packageBuffer, 'application/zip');
    }

    return packageKey;
  }

  private buildFamilyPackageKey(
    familyId: string,
    familySlug: string,
    styles: Array<{ id: string; sha256: string | null; updatedAt: Date }>,
  ): string {
    const packageSignature = createHash('sha256')
      .update(
        styles
          .map((style) => `${style.id}:${style.sha256 ?? 'nohash'}:${style.updatedAt.toISOString()}`)
          .join('|'),
      )
      .digest('hex')
      .slice(0, 20);

    return `packages/families/${familyId}/${packageSignature}/${this.sanitizeFilename(familySlug || 'font-family')}.zip`;
  }

  private async recordDownloadEvent(args: {
    familyId: string;
    styleId: string | null;
    userId: string | null;
    source: EventSource;
    request: AuthenticatedRequest;
  }) {
    await this.prisma.downloadEvent.create({
      data: {
        familyId: args.familyId,
        styleId: args.styleId,
        userId: args.userId,
        ipHash: this.hashValue(this.extractIpAddress(args.request)),
        userAgentHash: this.hashValue(this.extractUserAgent(args.request)),
        source: args.source,
      },
    });
  }

  private extractIpAddress(request: AuthenticatedRequest): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    const rawValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstHop = rawValue?.split(',')[0]?.trim();
    return firstHop || null;
  }

  private extractUserAgent(request: AuthenticatedRequest): string | null {
    const userAgent = request.headers['user-agent'];
    return (Array.isArray(userAgent) ? userAgent[0] : userAgent) ?? null;
  }

  private hashValue(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return createHash('sha256').update(value).digest('hex');
  }

  private resolveStyleExtension(format: string | null, fileKey: string): string {
    const normalizedFormat = format?.trim().toLowerCase();

    if (normalizedFormat) {
      return normalizedFormat;
    }

    const filename = fileKey.split('/').pop() ?? '';
    const extension = filename.includes('.') ? filename.split('.').pop() : null;

    return extension?.toLowerCase() || 'ttf';
  }

  private ensureUniqueFilename(filename: string, usedNames: Set<string>): string {
    if (!usedNames.has(filename)) {
      usedNames.add(filename);
      return filename;
    }

    const extensionIndex = filename.lastIndexOf('.');
    const baseName = extensionIndex === -1 ? filename : filename.slice(0, extensionIndex);
    const extension = extensionIndex === -1 ? '' : filename.slice(extensionIndex);
    let counter = 2;

    while (usedNames.has(`${baseName}-${counter}${extension}`)) {
      counter += 1;
    }

    const uniqueName = `${baseName}-${counter}${extension}`;
    usedNames.add(uniqueName);
    return uniqueName;
  }

  private sanitizeFilename(value: string): string {
    const sanitized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return sanitized || 'font-file';
  }
}
