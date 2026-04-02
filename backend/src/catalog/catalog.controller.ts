import { Controller, Get, Param, Query, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth-request';
import { CatalogService } from './catalog.service';
import { ListFontsDto } from './dto/list-fonts.dto';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('fonts')
  listFonts(@Query() query: ListFontsDto) {
    return this.catalogService.listFonts(query);
  }

  @Get('collections')
  listCollections() {
    return this.catalogService.listCollections();
  }

  @Get('collections/:identifier')
  getCollectionDetail(@Param('identifier') identifier: string) {
    return this.catalogService.getCollectionDetail(identifier);
  }

  @Get('fonts/filters')
  getFilters() {
    return this.catalogService.getFilters();
  }

  @Get('fonts/:slug/styles')
  getFamilyStyles(@Param('slug') slug: string) {
    return this.catalogService.getFamilyStyles(slug);
  }

  @Get('fonts/:slug')
  getFamilyDetail(@Param('slug') slug: string, @Req() request: AuthenticatedRequest) {
    return this.catalogService.getFamilyDetail(slug, request);
  }

  @Get('search/fonts')
  searchFonts(@Query() query: ListFontsDto, @Req() request: AuthenticatedRequest) {
    return this.catalogService.searchFonts(query, request);
  }
}
