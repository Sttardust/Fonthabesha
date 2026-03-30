import { Controller, Get } from '@nestjs/common';

import { LicensesService } from './licenses.service';

@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  listActive() {
    return this.licensesService.listActive();
  }
}

