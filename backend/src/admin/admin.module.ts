import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, SearchModule, UploadsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
