import { Controller, Get, NotFoundException, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

import type { AppEnvironment } from '../shared/config/app-env';
import { AuthContextService } from '../auth/auth-context.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { MailService } from './mail.service';

@Controller('internal/mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly authContext: AuthContextService,
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {}

  @Get('previews')
  async listPreviews(@Req() request: AuthenticatedRequest) {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    if (nodeEnv === 'production') {
      throw new NotFoundException();
    }

    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    return {
      items: this.mailService.listPreviews(),
    };
  }
}
