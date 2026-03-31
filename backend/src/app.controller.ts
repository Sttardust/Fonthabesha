import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex(): { name: string; status: string; docs: string } {
    return {
      name: 'fonthabesha-backend',
      status: 'ok',
      docs: '/docs',
    };
  }
}

