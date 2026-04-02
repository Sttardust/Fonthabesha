import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { ReviewAnalyticsQueryDto } from './dto/review-analytics-query.dto';
import { ReviewHistoryQueryDto } from './dto/review-history-query.dto';
import { CreateAdminCollectionDto } from './dto/create-admin-collection.dto';
import { UpdateAdminCollectionDto } from './dto/update-admin-collection.dto';
import { AddCollectionFamilyDto } from './dto/add-collection-family.dto';
import { UpsertVocabularyEntryDto } from './dto/upsert-vocabulary-entry.dto';
import { ListAdminFamiliesDto } from './dto/list-admin-families.dto';
import { UpdateAdminFamilyDto } from './dto/update-admin-family.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reviews')
  listReviewQueue(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    return this.adminService.listReviewQueue(request, status);
  }

  @Get('families')
  listFamilies(@Req() request: AuthenticatedRequest, @Query() query: ListAdminFamiliesDto) {
    return this.adminService.listFamilies(request, query);
  }

  @Get('families/:familyId')
  getFamilyDetail(@Req() request: AuthenticatedRequest, @Param('familyId') familyId: string) {
    return this.adminService.getFamilyDetail(request, familyId);
  }

  @Patch('families/:familyId')
  updateFamily(
    @Req() request: AuthenticatedRequest,
    @Param('familyId') familyId: string,
    @Body() payload: UpdateAdminFamilyDto,
  ) {
    return this.adminService.updateFamily(request, familyId, payload);
  }

  @Post('families/:familyId/archive')
  archiveFamily(@Req() request: AuthenticatedRequest, @Param('familyId') familyId: string) {
    return this.adminService.archiveFamily(request, familyId);
  }

  @Post('families/:familyId/restore')
  restoreFamily(@Req() request: AuthenticatedRequest, @Param('familyId') familyId: string) {
    return this.adminService.restoreFamily(request, familyId);
  }

  @Get('collections')
  listCollections(@Req() request: AuthenticatedRequest) {
    return this.adminService.listCollections(request);
  }

  @Post('collections')
  createCollection(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateAdminCollectionDto,
  ) {
    return this.adminService.createCollection(request, payload);
  }

  @Patch('collections/:collectionId')
  updateCollection(
    @Req() request: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Body() payload: UpdateAdminCollectionDto,
  ) {
    return this.adminService.updateCollection(request, collectionId, payload);
  }

  @Delete('collections/:collectionId')
  deleteCollection(@Req() request: AuthenticatedRequest, @Param('collectionId') collectionId: string) {
    return this.adminService.deleteCollection(request, collectionId);
  }

  @Post('collections/:collectionId/families')
  addCollectionFamily(
    @Req() request: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Body() payload: AddCollectionFamilyDto,
  ) {
    return this.adminService.addCollectionFamily(request, collectionId, payload);
  }

  @Delete('collections/:collectionId/families/:familyId')
  removeCollectionFamily(
    @Req() request: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Param('familyId') familyId: string,
  ) {
    return this.adminService.removeCollectionFamily(request, collectionId, familyId);
  }

  @Get('vocabulary')
  listVocabulary(@Req() request: AuthenticatedRequest) {
    return this.adminService.listVocabulary(request);
  }

  @Post('vocabulary')
  createVocabularyEntry(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpsertVocabularyEntryDto,
  ) {
    return this.adminService.createVocabularyEntry(request, payload);
  }

  @Patch('vocabulary/:type/:entryId')
  updateVocabularyEntry(
    @Req() request: AuthenticatedRequest,
    @Param('type') type: string,
    @Param('entryId') entryId: string,
    @Body() payload: UpsertVocabularyEntryDto,
  ) {
    return this.adminService.updateVocabularyEntry(request, type, entryId, payload);
  }

  @Delete('vocabulary/:type/:entryId')
  deleteVocabularyEntry(
    @Req() request: AuthenticatedRequest,
    @Param('type') type: string,
    @Param('entryId') entryId: string,
  ) {
    return this.adminService.deleteVocabularyEntry(request, type, entryId);
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

  @Get('reviews/analytics')
  getReviewAnalytics(@Req() request: AuthenticatedRequest, @Query() query: ReviewAnalyticsQueryDto) {
    return this.adminService.getReviewAnalytics(request, query);
  }

  @Get('reviews/:submissionId')
  getReviewDetail(@Req() request: AuthenticatedRequest, @Param('submissionId') submissionId: string) {
    return this.adminService.getReviewDetail(request, submissionId);
  }

  @Get('reviews/:submissionId/history')
  getReviewHistory(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Query() query: ReviewHistoryQueryDto,
  ) {
    return this.adminService.getReviewHistory(request, submissionId, query);
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
