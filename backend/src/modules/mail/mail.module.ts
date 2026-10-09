/**
 * Mail module — exposes MailService (nodemailer/SMTP with a dev outbox
 * fallback) plus a small controller to check the configuration, preview the
 * dev outbox and send a test message.
 */

import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
