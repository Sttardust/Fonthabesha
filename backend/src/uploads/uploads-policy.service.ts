import { BadRequestException, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthRateLimitService } from '../auth/auth-rate-limit.service';
import type { AppEnvironment } from '../shared/config/app-env';

const ALLOWED_FONT_EXTENSIONS = ['.ttf', '.otf', '.woff'] as const;
const ALLOWED_FONT_CONTENT_TYPES = new Set([
  'font/ttf',
  'font/otf',
  'font/woff',
  'application/font-sfnt',
  'application/font-woff',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/x-font-woff',
  'application/octet-stream',
]);

@Injectable()
export class UploadsPolicyService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  async assertContributorInitRateLimit(userId: string): Promise<void> {
    await this.assertRateLimit({
      scope: 'font-upload-init-user',
      identifier: userId,
      limit: this.configService.get('FONT_UPLOAD_INIT_LIMIT_PER_HOUR', { infer: true }),
      windowSeconds: 60 * 60,
      message: 'Too many upload initialization attempts. Please try again later.',
    });
  }

  async assertContributorCompleteRateLimit(userId: string): Promise<void> {
    await this.assertRateLimit({
      scope: 'font-upload-complete-user',
      identifier: userId,
      limit: this.configService.get('FONT_UPLOAD_COMPLETE_LIMIT_PER_HOUR', { infer: true }),
      windowSeconds: 60 * 60,
      message: 'Too many upload completion attempts. Please try again later.',
    });
  }

  assertSubmissionUploadCapacity(uploadCount: number): void {
    const maxUploads = this.configService.get('FONT_UPLOAD_MAX_FILES_PER_SUBMISSION', {
      infer: true,
    });

    if (uploadCount >= maxUploads) {
      throw new BadRequestException(
        `Submission upload limit reached. Maximum files per submission: ${maxUploads}.`,
      );
    }
  }

  validateDeclaredUpload(filename: string, contentType: string): void {
    this.assertFilename(filename);
    this.assertSupportedFileExtension(filename);
    this.assertSupportedContentType(contentType);
  }

  validateStoredUpload(args: {
    filename: string;
    contentType: string | null | undefined;
    contentLength: number;
  }): void {
    this.assertFilename(args.filename);
    this.assertSupportedFileExtension(args.filename);
    this.assertSupportedContentType(args.contentType);
    this.assertFileSize(args.contentLength);
  }

  validateDirectUpload(args: {
    filename: string;
    contentType: string;
    size: number;
  }): void {
    this.validateDeclaredUpload(args.filename, args.contentType);
    this.assertFileSize(args.size);
  }

  private async assertRateLimit(args: {
    scope: string;
    identifier: string;
    limit: number;
    windowSeconds: number;
    message: string;
  }): Promise<void> {
    const result = await this.authRateLimitService.consume(args);

    if (result.currentCount <= args.limit) {
      return;
    }

    throw new HttpException(
      `${args.message} Retry after ${result.retryAfterSeconds}s.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private assertFilename(filename: string): void {
    const trimmed = filename.trim();

    if (!trimmed) {
      throw new BadRequestException('filename is required');
    }

    if (trimmed.includes('/') || trimmed.includes('\\')) {
      throw new BadRequestException('filename must not contain path separators');
    }
  }

  private assertSupportedFileExtension(filename: string): void {
    const normalized = filename.trim().toLowerCase();

    if (ALLOWED_FONT_EXTENSIONS.some((extension) => normalized.endsWith(extension))) {
      return;
    }

    throw new BadRequestException(
      `Unsupported font file extension. Allowed extensions: ${ALLOWED_FONT_EXTENSIONS.join(', ')}.`,
    );
  }

  private assertSupportedContentType(contentType: string | null | undefined): void {
    const normalized = contentType?.trim().toLowerCase();

    if (normalized && ALLOWED_FONT_CONTENT_TYPES.has(normalized)) {
      return;
    }

    throw new BadRequestException('Unsupported font content type');
  }

  private assertFileSize(size: number): void {
    const maxBytes = this.configService.get('FONT_UPLOAD_MAX_BYTES', { infer: true });

    if (!Number.isFinite(size) || size <= 0) {
      throw new BadRequestException('Uploaded font file is empty');
    }

    if (size > maxBytes) {
      throw new BadRequestException(`Uploaded font file exceeds the ${maxBytes} byte limit`);
    }
  }
}
