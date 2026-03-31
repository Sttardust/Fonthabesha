import { Controller, Headers, Param, Post } from '@nestjs/common';

import { DownloadsService } from './downloads.service';

@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post('families/:familyId')
  issueFamilyDownload(
    @Param('familyId') familyId: string,
    @Headers('x-user-email') userEmail: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    return this.downloadsService.issueFamilyDownload(userEmail, familyId, {
      forwardedFor,
      userAgent,
    });
  }

  @Post('styles/:styleId')
  issueStyleDownload(
    @Param('styleId') styleId: string,
    @Headers('x-user-email') userEmail: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    return this.downloadsService.issueStyleDownload(userEmail, styleId, {
      forwardedFor,
      userAgent,
    });
  }
}
