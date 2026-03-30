import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class ContributorSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  listMine(@Headers('x-user-email') userEmail?: string) {
    return this.submissionsService.listContributorSubmissions(userEmail);
  }

  @Post()
  createDraft(
    @Headers('x-user-email') userEmail: string | undefined,
    @Body() payload: CreateSubmissionDto,
    @Req() request: { ip?: string },
  ) {
    return this.submissionsService.createDraftSubmission(userEmail, payload, request.ip);
  }
}
