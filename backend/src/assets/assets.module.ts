import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [UploadsModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
