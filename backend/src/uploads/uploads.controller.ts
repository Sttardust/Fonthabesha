import { Body, Controller, Post, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { InitUploadDto } from './dto/init-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('init')
  initUpload(@Req() request: AuthenticatedRequest, @Body() payload: InitUploadDto) {
    return this.uploadsService.initUpload(request, payload);
  }

  @Post('complete')
  completeUpload(@Req() request: AuthenticatedRequest, @Body() payload: CompleteUploadDto) {
    return this.uploadsService.completeUpload(request, payload);
  }
}
