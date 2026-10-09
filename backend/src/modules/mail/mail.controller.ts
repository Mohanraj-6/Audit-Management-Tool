/**
 * Mail Controller — lets you check the mail configuration, send a test
 * message and (in dev outbox mode) preview what would have been sent.
 *
 *   GET  /api/mail/status?verify=true   → transport, sender, SMTP connection
 *   GET  /api/mail/outbox              → messages captured in dev outbox mode
 *   POST /api/mail/test                → send a test email to a given address
 */

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { testEmail } from './mail-templates';

@ApiTags('mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('status')
  @ApiOperation({ summary: 'Current mail transport and sender configuration' })
  @ApiQuery({ name: 'verify', required: false, description: 'Also test the SMTP connection' })
  async status(@Query('verify') verify?: string) {
    const status = this.mailService.status();
    if (verify === 'true') {
      return { ...status, verification: await this.mailService.verify() };
    }
    return status;
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Messages captured in the dev outbox (SMTP not configured)' })
  @ApiQuery({ name: 'limit', required: false })
  async outbox(@Query('limit') limit?: string) {
    return this.mailService.listOutbox(limit ? Number(limit) : 25);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test email to confirm the mail settings' })
  async test(@Body() body: { to: string }) {
    const status = this.mailService.status();
    const { subject, text, html } = testEmail({
      companyName: status.companyName,
      appUrl: status.appUrl,
    });

    return this.mailService.send({
      to: [body?.to],
      subject,
      text,
      html,
      fromName: status.companyName,
    });
  }
}
