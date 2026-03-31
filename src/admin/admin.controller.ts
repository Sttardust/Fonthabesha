import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reviews')
  listReviewQueue(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    return this.adminService.listReviewQueue(request, status);
  }

  @Get('reviews/summary')
  getReviewSummary(@Req() request: AuthenticatedRequest) {
    return this.adminService.getReviewSummary(request);
  }

  @Get('reviews/:submissionId')
  getReviewDetail(@Req() request: AuthenticatedRequest, @Param('submissionId') submissionId: string) {
    return this.adminService.getReviewDetail(request, submissionId);
  }

  @Post('reviews/:submissionId/approve')
  approveSubmission(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.approveSubmission(request, submissionId, payload);
  }

  @Post('reviews/:submissionId/reject')
  rejectSubmission(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.rejectSubmission(request, submissionId, payload);
  }

  @Post('reviews/:submissionId/request-changes')
  requestChanges(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.requestChanges(request, submissionId, payload);
  }

  @Post('submissions/:submissionId/uploads/direct')
  @UseInterceptors(FileInterceptor('file'))
  directUploadToSubmission(
    @Req() request: AuthenticatedRequest,
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
    return this.adminService.directUploadToSubmission(request, submissionId, file, payload.notes);
  }
}
