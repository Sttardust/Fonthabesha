import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MailModule } from '../mail/mail.module';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({}), forwardRef(() => MailModule)],
  controllers: [AuthController],
  providers: [AuthContextService, AuthRateLimitService, AuthService],
  exports: [AuthContextService],
})
export class AuthModule {}
