import { randomUUID } from 'node:crypto';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from '../shared/config/app-env';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly rawBucket: string;

  constructor(configService: ConfigService<AppEnvironment, true>) {
    this.rawBucket = configService.get('S3_BUCKET_RAW', { infer: true });

    this.client = new S3Client({
      region: configService.get('S3_REGION', { infer: true }),
      endpoint: configService.get('S3_ENDPOINT', { infer: true }),
      forcePathStyle: true,
      credentials: {
        accessKeyId: configService.get('S3_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: configService.get('S3_SECRET_ACCESS_KEY', { infer: true }),
      },
    });
  }

  createRawUploadKey(submissionId: string, filename: string): { uploadId: string; storageKey: string } {
    const uploadId = randomUUID();
    const sanitizedFilename = filename
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      uploadId,
      storageKey: `submissions/${submissionId}/${uploadId}/${sanitizedFilename || 'font-file'}`,
    };
  }

  async createRawUploadUrl(storageKey: string, contentType: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.rawBucket,
        Key: storageKey,
        ContentType: contentType,
      }),
      {
        expiresIn: 15 * 60,
      },
    );
  }

  async getRawObjectMetadata(storageKey: string) {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.rawBucket,
        Key: storageKey,
      }),
    );

    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType ?? 'application/octet-stream',
      etag: response.ETag?.replaceAll('"', '') ?? null,
      lastModified: response.LastModified ?? null,
    };
  }
}
