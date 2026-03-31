import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ReviewDecisionDto } from './dto/review-decision.dto';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reviews')
  listReviewQueue(
    @Headers('x-user-email') userEmail: string | undefined,
    @Query('status') status?: string,
  ) {
    return this.adminService.listReviewQueue(userEmail, status);
  }

  @Get('reviews/summary')
  getReviewSummary(@Headers('x-user-email') userEmail: string | undefined) {
    return this.adminService.getReviewSummary(userEmail);
  }

  @Get('reviews/:submissionId')
  getReviewDetail(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
  ) {
    return this.adminService.getReviewDetail(userEmail, submissionId);
  }

  @Post('reviews/:submissionId/approve')
  approveSubmission(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.approveSubmission(userEmail, submissionId, payload);
  }

  @Post('reviews/:submissionId/reject')
  rejectSubmission(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.rejectSubmission(userEmail, submissionId, payload);
  }

  @Post('reviews/:submissionId/request-changes')
  requestChanges(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.requestChanges(userEmail, submissionId, payload);
  }

  @Post('submissions/:submissionId/uploads/direct')
  @UseInterceptors(FileInterceptor('file'))
  directUploadToSubmission(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
    @UploadedFile()
    file:
      | {
          originalname: string;
          mimetype: string;
          buffer: Buffer;
          size: number;
        }
      | undefined,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.directUploadToSubmission(userEmail, submissionId, file, payload.notes);
  }
}
