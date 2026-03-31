import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../uploads/s3-storage.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: S3StorageService,
  ) {}

  async getApprovedStyleAsset(styleId: string) {
    const style = await this.prisma.fontStyle.findUnique({
      where: {
        id: styleId,
      },
      select: {
        id: true,
        slug: true,
        format: true,
        fileKey: true,
        status: true,
        family: {
          select: {
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
      throw new NotFoundException('Approved style asset not found');
    }

    const [buffer, metadata] = await Promise.all([
      this.storageService.getRawObjectBuffer(style.fileKey),
      this.storageService.getRawObjectMetadata(style.fileKey),
    ]);

    return {
      buffer,
      contentType: metadata.contentType,
      contentLength: metadata.contentLength,
      filename: `${style.family.slug}-${style.slug}.${style.format?.trim().toLowerCase() || 'ttf'}`,
    };
  }
}
