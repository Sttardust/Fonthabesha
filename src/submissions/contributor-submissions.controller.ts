import { Body, Controller, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionMetadataDto } from './dto/update-submission-metadata.dto';
import { UpdateSubmissionStyleDto } from './dto/update-submission-style.dto';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class ContributorSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  listMine(@Headers('x-user-email') userEmail?: string) {
    return this.submissionsService.listContributorSubmissions(userEmail);
  }

  @Get(':submissionId')
  getSubmissionDetail(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
  ) {
    return this.submissionsService.getContributorSubmissionDetail(userEmail, submissionId);
  }

  @Post()
  createDraft(
    @Headers('x-user-email') userEmail: string | undefined,
    @Body() payload: CreateSubmissionDto,
    @Req() request: { ip?: string },
  ) {
    return this.submissionsService.createDraftSubmission(userEmail, payload, request.ip);
  }

  @Patch(':submissionId/metadata')
  updateSubmissionMetadata(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
    @Body() payload: UpdateSubmissionMetadataDto,
  ) {
    return this.submissionsService.updateContributorSubmissionMetadata(
      userEmail,
      submissionId,
      payload,
    );
  }

  @Patch(':submissionId/styles/:styleId')
  updateSubmissionStyle(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
    @Param('styleId') styleId: string,
    @Body() payload: UpdateSubmissionStyleDto,
  ) {
    return this.submissionsService.updateContributorStyle(userEmail, submissionId, styleId, payload);
  }

  @Post(':submissionId/submit')
  submitForReview(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('submissionId') submissionId: string,
  ) {
    return this.submissionsService.submitContributorSubmission(userEmail, submissionId);
  }
}
