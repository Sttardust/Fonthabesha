import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';

import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('styles/:styleId')
  async getApprovedStyleAsset(
    @Param('styleId') styleId: string,
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ) {
    const asset = await this.assetsService.getApprovedStyleAsset(styleId);

    response.setHeader('Content-Type', asset.contentType);
    response.setHeader('Content-Length', String(asset.contentLength));
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.setHeader('Content-Disposition', `inline; filename="${asset.filename}"`);

    return new StreamableFile(asset.buffer);
  }
}
