import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionMetadataDto } from './dto/update-submission-metadata.dto';
import { UpdateSubmissionStyleDto } from './dto/update-submission-style.dto';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class ContributorSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  listMine(@Req() request: AuthenticatedRequest) {
    return this.submissionsService.listContributorSubmissions(request);
  }

  @Get(':submissionId')
  getSubmissionDetail(@Req() request: AuthenticatedRequest, @Param('submissionId') submissionId: string) {
    return this.submissionsService.getContributorSubmissionDetail(request, submissionId);
  }

  @Post()
  createDraft(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateSubmissionDto,
  ) {
    return this.submissionsService.createDraftSubmission(request, payload, request.ip);
  }

  @Patch(':submissionId/metadata')
  updateSubmissionMetadata(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() payload: UpdateSubmissionMetadataDto,
  ) {
    return this.submissionsService.updateContributorSubmissionMetadata(
      request,
      submissionId,
      payload,
    );
  }

  @Patch(':submissionId/styles/:styleId')
  updateSubmissionStyle(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Param('styleId') styleId: string,
    @Body() payload: UpdateSubmissionStyleDto,
  ) {
    return this.submissionsService.updateContributorStyle(request, submissionId, styleId, payload);
  }

  @Post(':submissionId/submit')
  submitForReview(@Req() request: AuthenticatedRequest, @Param('submissionId') submissionId: string) {
    return this.submissionsService.submitContributorSubmission(request, submissionId);
  }
}
