import { Module } from '@nestjs/common';

import { SearchIndexService } from './search-index.service';

@Module({
  providers: [SearchIndexService],
  exports: [SearchIndexService],
})
export class SearchModule {}
