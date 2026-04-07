import { Module } from '@nestjs/common';

import { DownloadsModule } from '../downloads/downloads.module';
import { SearchModule } from '../search/search.module';
import { BackgroundJobsService } from './background-jobs.service';

@Module({
  imports: [SearchModule, DownloadsModule],
  providers: [BackgroundJobsService],
  exports: [BackgroundJobsService],
})
export class BackgroundJobsModule {}
