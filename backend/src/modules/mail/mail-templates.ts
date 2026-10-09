/**
 * Email templates — plain-text + HTML bodies for the transactional mails the
 * API sends. Kept separate from MailService so the wording is easy to change.
 */

export interface MailPerson {
  firstName: string;
  lastName?: string | null;
  email: string;
}

export function personName(person?: MailPerson | null): string {
  if (!person) return '';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim();
}

export interface AuditAssignmentEmailInput {
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
  /** The auditor the mail is sent "from". */
  auditor: MailPerson;
  /** The allotted user the mail is addressed to. */
  recipient: MailPerson;
  /** Optional note typed by the auditor. */
  message?: string;
  /** Base URL of the web app, used for the "open the audit" button. */
  appUrl: string;
  companyName: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (value?: Date | null): string => {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Builds the "an audit has been allotted to you" email, sent by the auditor.
 */
export function auditAssignmentEmail(input: AuditAssignmentEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const { audit, auditor, recipient, companyName, appUrl } = input;
  const auditorName = personName(auditor) || 'Auditor';
  const recipientName = personName(recipient) || 'there';
  const auditUrl = `${appUrl.replace(/\/$/, '')}/audits/${audit.id}`;

  const subject = `${companyName} — Audit ${audit.auditNumber} allotted to you: ${audit.title}`;

  const rows: Array<[string, string]> = [
    ['Audit number', audit.auditNumber],
    ['Title', audit.title],
    ['Template', input.templateName || '—'],
    ['Department', input.departmentName || '—'],
    ['Location', input.locationName || '—'],
    ['Scheduled date', formatDate(audit.scheduledDate)],
    ['Due date', formatDate(audit.dueDate)],
  ];

  const text = [
    `Hello ${recipientName},`,
    '',
    `${auditorName} (${auditor.email}) has allotted the following audit to you:`,
    '',
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    '',
    ...(audit.description ? ['Scope / description:', audit.description, ''] : []),
    ...(input.message ? [`Message from ${auditorName}:`, input.message, ''] : []),
    `Open the audit: ${auditUrl}`,
    '',
    `Regards,`,
    `${auditorName}`,
    `${auditor.email}`,
    companyName,
  ].join('\n');

  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.5">
  <p>Hello ${escapeHtml(recipientName)},</p>
  <p><strong>${escapeHtml(auditorName)}</strong> (${escapeHtml(auditor.email)}) has allotted the
  following audit to you${audit.dueDate ? `, due <strong>${formatDate(audit.dueDate)}</strong>` : ''}:</p>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;margin:12px 0">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">${escapeHtml(
            label,
          )}</td><td style="border:1px solid #e2e8f0">${escapeHtml(value)}</td></tr>`,
      )
      .join('\n    ')}
  </table>
  ${
    audit.description
      ? `<p style="margin:12px 0"><strong>Scope / description</strong><br />${escapeHtml(audit.description)}</p>`
      : ''
  }
  ${
    input.message
      ? `<div style="border-left:3px solid #6366f1;padding:8px 12px;background:#eef2ff;margin:12px 0">
      <strong>Message from ${escapeHtml(auditorName)}</strong><br />${escapeHtml(input.message)}</div>`
      : ''
  }
  <p style="margin:16px 0">
    <a href="${auditUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open the audit</a>
  </p>
  <p style="color:#64748b">If the button does not work, copy this link into your browser:<br />${escapeHtml(auditUrl)}</p>
  <p style="margin-top:20px">Regards,<br /><strong>${escapeHtml(auditorName)}</strong><br />
  <a href="mailto:${escapeHtml(auditor.email)}">${escapeHtml(auditor.email)}</a><br />
  <span style="color:#64748b">${escapeHtml(companyName)}</span></p>
</div>`;

  return { subject, text, html };
}

/** Builds a simple "your mail settings work" test message. */
export function testEmail(input: { companyName: string; appUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `${input.companyName} — test email`;
  const body = `This is a test message from the Audit Management System (${input.appUrl}). If you received it, the SMTP settings are working.`;
  return {
    subject,
    text: body,
    html: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#1e293b">
  <p>${escapeHtml(body)}</p>
</div>`,
  };
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
