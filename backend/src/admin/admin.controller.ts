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
import { AuthAuditQueryDto } from './dto/auth-audit-query.dto';
import { AuthSessionQueryDto } from './dto/auth-session-query.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reviews')
  listReviewQueue(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    return this.adminService.listReviewQueue(request, status);
  }

  @Get('auth-audit')
  listAuthAuditEvents(@Req() request: AuthenticatedRequest, @Query() query: AuthAuditQueryDto) {
    return this.adminService.listAuthAuditEvents(request, query);
  }

  @Get('auth-audit/summary')
  getAuthAuditSummary(@Req() request: AuthenticatedRequest) {
    return this.adminService.getAuthAuditSummary(request);
  }

  @Get('auth-sessions')
  listAuthSessions(@Req() request: AuthenticatedRequest, @Query() query: AuthSessionQueryDto) {
    return this.adminService.listAuthSessions(request, query);
  }

  @Post('auth-sessions/:sessionId/revoke')
  revokeAuthSession(@Req() request: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.adminService.revokeAuthSession(request, sessionId);
  }

  @Post('users/:userId/auth-sessions/revoke')
  revokeUserAuthSessions(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.adminService.revokeUserAuthSessions(request, userId);
  }

  @Get('users/:userId/login-lockout')
  getUserLoginLockout(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.adminService.getUserLoginLockout(request, userId);
  }

  @Post('users/:userId/login-lockout/clear')
  clearUserLoginLockout(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.adminService.clearUserLoginLockout(request, userId);
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

  @Post('reviews/:submissionId/reprocess')
  reprocessSubmission(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() payload: ReviewDecisionDto,
  ) {
    return this.adminService.reprocessSubmission(request, submissionId, payload.notes);
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

  @Post('search/reindex')
  reindexApprovedFamilies(@Req() request: AuthenticatedRequest) {
    return this.adminService.reindexApprovedFamilies(request);
  }
}
