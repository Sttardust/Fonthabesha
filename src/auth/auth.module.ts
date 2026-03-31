import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthContextService, AuthService],
  exports: [AuthContextService],
})
export class AuthModule {}
