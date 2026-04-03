import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [AuthModule, SearchModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
