import { Module } from '@nestjs/common';

import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthContextService, AuthService],
  exports: [AuthContextService],
})
export class AuthModule {}
