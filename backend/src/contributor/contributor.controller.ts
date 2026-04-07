import { Controller, Get, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { ContributorService } from './contributor.service';

@Controller('contributor')
export class ContributorController {
  constructor(private readonly contributorService: ContributorService) {}

  @Get('compliance/requirements')
  getComplianceRequirements(@Req() request: AuthenticatedRequest) {
    return this.contributorService.getComplianceRequirements(request);
  }
}
