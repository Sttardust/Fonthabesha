import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';

import type { AppEnvironment } from '../shared/config/app-env';

type MailKind = 'password_reset' | 'email_verification';

type MailPreview = {
  id: string;
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  actionUrl: string;
  delivery: 'smtp' | 'preview' | 'queued';
  createdAt: string;
};

type MailDeliveryResult = {
  delivery: 'queued' | 'smtp' | 'preview';
  jobId?: string;
};

type MailDispatchPayload = {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  actionUrl: string;
};

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly previews: MailPreview[] = [];
  private readonly transporter;
  private readonly fromEmail: string | undefined;
  private readonly replyToEmail: string | undefined;
  private readonly frontendUrl: string;
  private readonly verifyEmailPath: string;
  private readonly resetPasswordPath: string;
  private readonly queue: Queue<MailDispatchPayload> | null;
  private readonly worker: Worker<MailDispatchPayload> | null;
  private readonly queueConnection: Redis | null;
  private readonly workerConnection: Redis | null;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {
    const smtpUrl = this.configService.get('SMTP_URL', { infer: true });
    const redisUrl = this.configService.get('REDIS_URL', { infer: true });
    const mailQueueEnabled = this.configService.get('MAIL_QUEUE_ENABLED', { infer: true });

    this.fromEmail = this.configService.get('MAIL_FROM_EMAIL', { infer: true });
    this.replyToEmail = this.configService.get('MAIL_REPLY_TO_EMAIL', { infer: true });
    this.frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    this.verifyEmailPath =
      this.configService.get('FRONTEND_VERIFY_EMAIL_PATH', { infer: true }) ?? '/verify-email';
    this.resetPasswordPath =
      this.configService.get('FRONTEND_RESET_PASSWORD_PATH', { infer: true }) ?? '/reset-password';

    this.transporter = smtpUrl ? nodemailer.createTransport(smtpUrl) : null;

    if (redisUrl && mailQueueEnabled) {
      this.queueConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
      this.workerConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
      this.queue = new Queue<MailDispatchPayload>('mail-delivery', {
        connection: this.queueConnection,
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: 100,
          removeOnFail: 500,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });
      this.worker = new Worker<MailDispatchPayload>(
        'mail-delivery',
        async (job) => {
          await this.deliverNow(job.data);
        },
        {
          connection: this.workerConnection,
        },
      );
      this.worker.on('error', (error) => {
        this.logger.warn(`Mail queue worker error: ${error.message}`);
      });
    } else {
      this.queueConnection = null;
      this.workerConnection = null;
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.worker?.close().catch(() => undefined),
      this.queue?.close().catch(() => undefined),
      this.workerConnection?.quit().catch(() => undefined),
      this.queueConnection?.quit().catch(() => undefined),
    ]);
  }

  async sendEmailVerificationEmail(args: {
    to: string;
    displayName: string;
    token: string;
    expiresInMinutes: number;
  }): Promise<MailDeliveryResult> {
    const actionUrl = this.buildFrontendUrl(this.verifyEmailPath, args.token);
    const subject = 'Verify your Fonthabesha contributor account';
    const text = [
      `Hello ${args.displayName},`,
      '',
      'Verify your email address to complete your Fonthabesha contributor setup.',
      `This verification link expires in ${args.expiresInMinutes} minutes.`,
      '',
      actionUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    return this.dispatch({
      kind: 'email_verification',
      to: args.to,
      subject,
      text,
      actionUrl,
    });
  }

  async sendPasswordResetEmail(args: {
    to: string;
    displayName: string;
    token: string;
    expiresInMinutes: number;
  }): Promise<MailDeliveryResult> {
    const actionUrl = this.buildFrontendUrl(this.resetPasswordPath, args.token);
    const subject = 'Reset your Fonthabesha password';
    const text = [
      `Hello ${args.displayName},`,
      '',
      'Use the link below to reset your password.',
      `This reset link expires in ${args.expiresInMinutes} minutes.`,
      '',
      actionUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    return this.dispatch({
      kind: 'password_reset',
      to: args.to,
      subject,
      text,
      actionUrl,
    });
  }

  listPreviews(): MailPreview[] {
    return [...this.previews];
  }

  private async dispatch(message: MailDispatchPayload): Promise<MailDeliveryResult> {
    if (this.queue) {
      try {
        const job = await this.queue.add(`mail:${message.kind}`, message);
        return {
          delivery: 'queued',
          jobId: String(job.id),
        };
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Mail queue unavailable, falling back to direct delivery: ${errMessage}`);
      }
    }

    return this.deliverNow(message);
  }

  private async deliverNow(message: MailDispatchPayload): Promise<MailDeliveryResult> {
    if (this.transporter && this.fromEmail) {
      await this.transporter.sendMail({
        from: this.fromEmail,
        replyTo: this.replyToEmail,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });

      return {
        delivery: 'smtp' as const,
      };
    }

    const preview: MailPreview = {
      id: randomUUID(),
      delivery: 'preview',
      createdAt: new Date().toISOString(),
      ...message,
    };

    this.previews.unshift(preview);
    this.previews.splice(20);

    this.logger.log(
      `[mail-preview] ${preview.kind} -> ${preview.to}\n${preview.subject}\n${preview.actionUrl}`,
    );

    return {
      delivery: 'preview' as const,
    };
  }

  private buildFrontendUrl(path: string, token: string): string {
    const normalizedBase = this.frontendUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}?token=${encodeURIComponent(token)}`;
  }
}
