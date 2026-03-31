import { Body, Controller, Headers, Post } from '@nestjs/common';

import { CompleteUploadDto } from './dto/complete-upload.dto';
import { InitUploadDto } from './dto/init-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('init')
  initUpload(@Headers('x-user-email') userEmail: string | undefined, @Body() payload: InitUploadDto) {
    return this.uploadsService.initUpload(userEmail, payload);
  }

  @Post('complete')
  completeUpload(
    @Headers('x-user-email') userEmail: string | undefined,
    @Body() payload: CompleteUploadDto,
  ) {
    return this.uploadsService.completeUpload(userEmail, payload);
  }
}
