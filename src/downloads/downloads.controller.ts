import { Controller, Param, Post, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { DownloadsService } from './downloads.service';

@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post('families/:familyId')
  issueFamilyDownload(
    @Param('familyId') familyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.downloadsService.issueFamilyDownload(request, familyId);
  }

  @Post('styles/:styleId')
  issueStyleDownload(
    @Param('styleId') styleId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.downloadsService.issueStyleDownload(request, styleId);
  }
}
