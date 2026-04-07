import { Controller, Get } from '@nestjs/common';

import { UsersService } from './users.service';

@Controller('internal/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('summary')
  getSummary(): Promise<{ totalUsers: number; contributors: number }> {
    return this.usersService.getSystemSummary();
  }
}

