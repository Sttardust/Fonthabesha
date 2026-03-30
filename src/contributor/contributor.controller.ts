import { Controller, Get, Headers } from '@nestjs/common';

import { ContributorService } from './contributor.service';

@Controller('contributor')
export class ContributorController {
  constructor(private readonly contributorService: ContributorService) {}

  @Get('compliance/requirements')
  getComplianceRequirements(@Headers('x-user-email') userEmail?: string) {
    return this.contributorService.getComplianceRequirements(userEmail);
  }
}
