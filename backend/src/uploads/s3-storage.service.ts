import { randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from '../shared/config/app-env';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly rawBucket: string;

  constructor(
    @Inject(ConfigService)
    configService: ConfigService<AppEnvironment, true>,
  ) {
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

  async createRawDownloadUrl(
    storageKey: string,
    downloadName: string,
    expiresInSeconds = 15 * 60,
  ): Promise<{ url: string; expiresAt: string }> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.rawBucket,
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${downloadName}"`,
      }),
      {
        expiresIn: expiresInSeconds,
      },
    );

    return {
      url,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async putRawObject(storageKey: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.rawBucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteRawObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.rawBucket,
        Key: storageKey,
      }),
    );
  }

  async getRawObjectBuffer(storageKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.rawBucket,
        Key: storageKey,
      }),
    );

    const byteArray = await response.Body?.transformToByteArray();

    if (!byteArray) {
      throw new Error(`Failed to read uploaded object for key ${storageKey}`);
    }

    return Buffer.from(byteArray);
  }

  async rawObjectExists(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.rawBucket,
          Key: storageKey,
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof NoSuchKey ||
        (typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          typeof error.name === 'string' &&
          ['NotFound', 'NoSuchKey', 'UnknownError'].includes(error.name))
      ) {
        return false;
      }

      throw error;
    }
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
