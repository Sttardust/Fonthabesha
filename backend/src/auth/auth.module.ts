import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MailModule } from '../mail/mail.module';
import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({}), forwardRef(() => MailModule)],
  controllers: [AuthController],
  providers: [AuthContextService, AuthService],
  exports: [AuthContextService],
})
export class AuthModule {}
