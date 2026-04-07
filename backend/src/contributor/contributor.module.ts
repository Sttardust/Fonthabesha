import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ContributorController } from './contributor.controller';
import { ContributorService } from './contributor.service';

@Module({
  imports: [AuthModule],
  controllers: [ContributorController],
  providers: [ContributorService],
})
export class ContributorModule {}
