import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ContributorSubmissionsController } from './contributor-submissions.controller';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [AuthModule],
  controllers: [SubmissionsController, ContributorSubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
