import { Controller, Get } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';

import { SubmissionsService } from './submissions.service';

@Controller('internal/submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('summary')
  getWorkflowSummary(): Promise<Record<SubmissionStatus, number>> {
    return this.submissionsService.getWorkflowSummary();
  }
}
