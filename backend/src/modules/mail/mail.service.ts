/**
 * Mail Service — transactional email for the Audit Management System.
 *
 * The transport is picked from the environment, so no code change is needed to
 * switch modes:
 *
 *   1. SMTP configured (SMTP_HOST set) → real delivery through nodemailer.
 *   2. SMTP not configured            → "dev outbox" mode: the message is
 *      written as a .eml file to apps/api/mail-outbox/ and logged, which keeps
 *      the whole flow demonstrable without a mail server.
 *
 * Sending never throws — a failure is logged and, if SMTP delivery fails, the
 * message is still written to the outbox so nothing is silently lost.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { auditAssignmentEmail, personName, MailPerson } from './mail-templates';

export interface SendMailParams {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  /** Display name of the sender — normally the auditor. */
  fromName?: string;
  /** Address of the sender — normally the auditor. */
  fromEmail?: string;
  replyTo?: string;
  cc?: string[];
}

export interface MailResult {
  delivered: boolean;
  transport: 'smtp' | 'outbox' | 'none';
  recipients: string[];
  messageId?: string;
  file?: string;
  error?: string;
}

export interface AuditAssignmentMailInput {
  audit: {
    id: string;
    auditNumber: string;
    title: string;
    description?: string | null;
    scheduledDate?: Date | null;
    dueDate?: Date | null;
  };
  templateName?: string | null;
  departmentName?: string | null;
  locationName?: string | null;
  /** The auditor the mail is sent from. */
  auditor: MailPerson;
  /** The allotted users the mail goes to. */
  recipients: Array<MailPerson & { id?: string }>;
  /** Optional note typed by the auditor. */
  message?: string;
}

export interface AuditAssignmentMailSummary {
  attempted: number;
  delivered: number;
  outboxed: number;
  failed: number;
  transport: 'smtp' | 'outbox' | 'none';
  results: Array<{
    userId?: string;
    email: string;
    name: string;
    delivered: boolean;
    transport: 'smtp' | 'outbox' | 'none';
    error?: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: any = null;

  private get host(): string {
    return process.env.SMTP_HOST || '';
  }

  private get port(): number {
    const parsed = Number(process.env.SMTP_PORT);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
  }

  private get secure(): boolean {
    return String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || this.port === 465;
  }

  private get user(): string {
    return process.env.SMTP_USER || '';
  }

  private get password(): string {
    return process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
  }

  /** Envelope sender. When unset, mail is sent from the auditor's address. */
  private get mailFrom(): string {
    return process.env.MAIL_FROM || '';
  }

  private get appUrl(): string {
    return (
      process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );
  }

  private get companyName(): string {
    return (
      process.env.MAIL_COMPANY_NAME ||
      process.env.NEXT_PUBLIC_COMPANY_NAME ||
      'Audit Management System'
    );
  }

  private get outboxDir(): string {
    return process.env.MAIL_OUTBOX_DIR || path.join(process.cwd(), 'mail-outbox');
  }

  /** True when a real SMTP server is configured. */
  isConfigured(): boolean {
    return Boolean(this.host);
  }

  /** Current mail configuration — surfaced by GET /api/mail/status. */
  status() {
    return {
      mode: this.isConfigured() ? 'smtp' : 'outbox',
      smtp: this.isConfigured()
        ? { host: this.host, port: this.port, secure: this.secure, user: this.user || null }
        : null,
      from: this.mailFrom || null,
      companyName: this.companyName,
      appUrl: this.appUrl,
      outboxDir: this.outboxDir,
      hint: this.isConfigured()
        ? 'SMTP is configured — emails are delivered for real.'
        : 'SMTP_HOST is not set — emails are written to the dev outbox folder instead of being delivered.',
    };
  }

  private getTransport(): any {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: this.user ? { user: this.user, pass: this.password } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      } as any);
    }
    return this.transporter;
  }

  /** Checks the SMTP connection — surfaced by GET /api/mail/status?verify=true. */
  async verify(): Promise<{ ok: boolean; mode: string; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, mode: 'outbox', error: 'SMTP_HOST is not set' };
    }
    try {
      await this.getTransport().verify();
      return { ok: true, mode: 'smtp' };
    } catch (error) {
      return { ok: false, mode: 'smtp', error: (error as Error).message };
    }
  }

  /**
   * Sends one message. Returns a result object instead of throwing so callers
   * (for example the audit workflow) are never broken by a mail problem.
   */
  async send(params: SendMailParams): Promise<MailResult> {
    const recipients = (params.to || [])
      .map((address) => String(address || '').trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      return {
        delivered: false,
        transport: 'none',
        recipients: [],
        error: 'No recipients were provided',
      };
    }

    const message = {
      from: this.resolveFrom(params),
      to: recipients.join(', '),
      cc: params.cc && params.cc.length ? params.cc.join(', ') : undefined,
      replyTo: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    if (!this.isConfigured()) {
      return this.writeToOutbox(message, recipients);
    }

    try {
      const info: any = await this.getTransport().sendMail(message);
      this.logger.log(
        `Email sent to ${recipients.join(', ')} — "${params.subject}" (messageId: ${info?.messageId})`,
      );
      return { delivered: true, transport: 'smtp', recipients, messageId: info?.messageId };
    } catch (error) {
      const reason = (error as Error).message;
      this.logger.error(
        `SMTP delivery to ${recipients.join(', ')} failed: ${reason}. Keeping the message in the outbox.`,
      );
      return this.writeToOutbox(message, recipients, reason);
    }
  }

  /**
   * Sends the "this audit has been allotted to you" mail to every recipient,
   * personalised per user and sent from the auditor.
   */
  async sendAuditAssignment(input: AuditAssignmentMailInput): Promise<AuditAssignmentMailSummary> {
    const results: AuditAssignmentMailSummary['results'] = [];

    for (const recipient of input.recipients) {
      const { subject, text, html } = auditAssignmentEmail({
        audit: input.audit,
        templateName: input.templateName,
        departmentName: input.departmentName,
        locationName: input.locationName,
        auditor: input.auditor,
        recipient,
        message: input.message,
        appUrl: this.appUrl,
        companyName: this.companyName,
      });

      const result = await this.send({
        to: [recipient.email],
        subject,
        text,
        html,
        fromName: personName(input.auditor),
        fromEmail: input.auditor.email,
        replyTo: input.auditor.email,
      });

      results.push({
        userId: recipient.id,
        email: recipient.email,
        name: personName(recipient),
        delivered: result.delivered,
        transport: result.transport,
        error: result.error,
      });
    }

    return {
      attempted: results.length,
      delivered: results.filter((row) => row.transport === 'smtp' && row.delivered).length,
      outboxed: results.filter((row) => row.transport === 'outbox').length,
      failed: results.filter((row) => row.transport === 'none').length,
      transport: results[0]?.transport ?? 'none',
      results,
    };
  }

  /** Lists the messages captured in dev outbox mode (newest first). */
  async listOutbox(limit = 25) {
    try {
      const files = await fs.promises.readdir(this.outboxDir);
      const selected = files
        .filter((file) => file.toLowerCase().endsWith('.eml'))
        .sort()
        .reverse()
        .slice(0, Math.max(1, limit));

      const mails: Array<Record<string, string | null>> = [];
      for (const file of selected) {
        const raw = await fs.promises.readFile(path.join(this.outboxDir, file), 'utf8');
        const header = (key: string): string | null => {
          const match = raw.match(new RegExp(`^${key}: (.*)$`, 'm'));
          return match ? match[1].trim() : null;
        };
        mails.push({
          file,
          to: header('To'),
          from: header('From'),
          subject: header('Subject'),
          date: header('Date'),
          mode: header('X-Outbox-Mode'),
        });
      }

      return { directory: this.outboxDir, count: mails.length, mails };
    } catch {
      return { directory: this.outboxDir, count: 0, mails: [] };
    }
  }

  /**
   * When MAIL_FROM is set it is used as the envelope sender (most SMTP
   * providers reject arbitrary From addresses) and the auditor becomes the
   * display name + Reply-To. Without MAIL_FROM the mail is sent literally
   * from the auditor.
   */
  private resolveFrom(params: SendMailParams): string {
    const name = String(params.fromName || '').replace(/"/g, '').trim();

    if (this.mailFrom) {
      return name ? `"${name}" <${this.mailFrom}>` : this.mailFrom;
    }
    if (params.fromEmail) {
      return name ? `"${name}" <${params.fromEmail}>` : params.fromEmail;
    }
    return this.user;
  }

  private async writeToOutbox(
    message: {
      from: string;
      to: string;
      cc?: string;
      replyTo?: string;
      subject: string;
      text: string;
      html?: string;
    },
    recipients: string[],
    error?: string,
  ): Promise<MailResult> {
    try {
      await fs.promises.mkdir(this.outboxDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const slug =
        message.subject
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'mail';
      const file = path.join(this.outboxDir, `${stamp}__${slug}.eml`);

      const lines: Array<string | null> = [
        `X-Outbox-Mode: ${error ? `smtp-failed (${error})` : 'smtp-not-configured'}`,
        `Date: ${new Date().toUTCString()}`,
        `From: ${message.from}`,
        `To: ${message.to}`,
        message.cc ? `Cc: ${message.cc}` : null,
        message.replyTo ? `Reply-To: ${message.replyTo}` : null,
        `Subject: ${message.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        message.html || message.text,
        '',
      ];

      await fs.promises.writeFile(
        file,
        lines.filter((line) => line !== null).join('\r\n'),
        'utf8',
      );
      this.logger.log(`[dev outbox] Email for ${recipients.join(', ')} written to ${file}`);

      return { delivered: false, transport: 'outbox', recipients, file, error };
    } catch (writeError) {
      this.logger.error(`Could not write the email to the outbox: ${(writeError as Error).message}`);
      return {
        delivered: false,
        transport: 'none',
        recipients,
        error: error || (writeError as Error).message,
      };
    }
  }
}
