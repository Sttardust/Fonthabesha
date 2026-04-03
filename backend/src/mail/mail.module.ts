import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
