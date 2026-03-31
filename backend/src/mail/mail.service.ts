import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

import type { AppEnvironment } from '../shared/config/app-env';

type MailPreview = {
  id: string;
  kind: 'password_reset' | 'email_verification';
  to: string;
  subject: string;
  text: string;
  actionUrl: string;
  delivery: 'smtp' | 'preview';
  createdAt: string;
};

type MailDeliveryResult = {
  delivery: 'smtp' | 'preview';
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly previews: MailPreview[] = [];
  private readonly transporter;
  private readonly fromEmail: string | undefined;
  private readonly replyToEmail: string | undefined;
  private readonly frontendUrl: string;
  private readonly verifyEmailPath: string;
  private readonly resetPasswordPath: string;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {
    const smtpUrl = this.configService.get('SMTP_URL', { infer: true });

    this.fromEmail = this.configService.get('MAIL_FROM_EMAIL', { infer: true });
    this.replyToEmail = this.configService.get('MAIL_REPLY_TO_EMAIL', { infer: true });
    this.frontendUrl = this.configService.get('FRONTEND_URL', { infer: true });
    this.verifyEmailPath =
      this.configService.get('FRONTEND_VERIFY_EMAIL_PATH', { infer: true }) ?? '/verify-email';
    this.resetPasswordPath =
      this.configService.get('FRONTEND_RESET_PASSWORD_PATH', { infer: true }) ?? '/reset-password';

    this.transporter = smtpUrl ? nodemailer.createTransport(smtpUrl) : null;
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

    return this.deliver({
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

    return this.deliver({
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

  private async deliver(message: Omit<MailPreview, 'id' | 'delivery' | 'createdAt'>) {
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
