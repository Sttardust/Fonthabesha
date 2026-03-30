import { Controller, Get } from '@nestjs/common';

import { SubmissionsService } from './submissions.service';

@Controller('internal/submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('summary')
  getWorkflowSummary(): Promise<Record<string, number>> {
    return this.submissionsService.getWorkflowSummary();
  }
}

