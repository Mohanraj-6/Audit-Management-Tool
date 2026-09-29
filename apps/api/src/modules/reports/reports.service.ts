/**
 * Reports Service — generates PDF and Excel audit reports.
 * Uses pdfmake for PDF generation and exceljs for Excel exports.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from '../../entities/audit.entity';
import { Finding } from '../../entities/finding.entity';
import { CorrectiveAction } from '../../entities/corrective-action.entity';
import { AuditAnswer } from '../../entities/audit-answer.entity';
import { AuditTemplate } from '../../entities/audit-template.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Audit) private auditRepository: Repository<Audit>,
    @InjectRepository(Finding) private findingRepository: Repository<Finding>,
    @InjectRepository(CorrectiveAction) private actionRepository: Repository<CorrectiveAction>,
    @InjectRepository(AuditAnswer) private answerRepository: Repository<AuditAnswer>,
    @InjectRepository(AuditTemplate) private templateRepository: Repository<AuditTemplate>,
    private AuditLogsService: AuditLogsService,
    ) {}

  /**
   * Get full report data for an audit — includes template, answers, findings, actions.
   */
  async getReportData(auditId: string): Promise<any> {
    const audit = await this.auditRepository.findOne({
      where: { id: auditId },
      relations: [
        'template', 'template.categories', 'template.categories.questions',
        'auditor', 'department', 'location',
        'answers', 'answers.question', 'findings', 'findings.correctiveAction',
      ],
    });
    if (!audit) throw new NotFoundException(`Audit with ID ${auditId} not found`);

    // Group answers by category
    const categories: Record<string, any> = {};
    const answers = audit.answers || [];
    const template = audit.template;

    if (template.categories) {
      for (const cat of template.categories) {
        categories[cat.id] = { id: cat.id, name: cat.name, description: cat.description, sortOrder: cat.sortOrder, questions: [] };
      }
    }

    const templateQuestions = template.categories?.flatMap((c) => c.questions || []) || template.questions || [];
    for (const q of templateQuestions) {
      const answer = answers.find((a) => a.questionId === q.id);
      const catId = q.categoryId;
      const catName = template.categories?.find((c) => c.id === catId)?.name || 'Uncategorized';
      if (!categories[catName]) categories[catName] = { id: catId, name: catName, description: '', questions: [] };

      categories[catName].questions.push({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        isMandatory: q.isMandatory,
        weight: Number(q.weight),
        answer: answer ? answer.answer : null,
        comment: answer ? answer.comment : '',
        evidenceIds: answer ? answer.evidenceIds : [],
      });
    }

    const findings = audit.findings.map((f) => ({
      id: f.id,
      findingNumber: f.findingNumber,
      description: f.description,
      severity: f.severity,
      status: f.status,
      category: f.category,
      responsibleDepartment: f.responsibleDepartment,
      responsiblePerson: f.responsiblePerson ? { id: f.responsiblePerson.id, name: `${f.responsiblePerson.firstName} ${f.responsiblePerson.lastName}` } : null,
      dueDate: f.dueDate,
      createdBy: f.createdBy ? { id: f.createdBy.id, name: `${f.createdBy.firstName} ${f.createdBy.lastName}` } : null,
      createdAt: f.createdAt,
      evidence: f.evidence,
      correctiveAction: f.correctiveAction ? {
        actionNumber: f.correctiveAction.actionNumber,
        rootCause: f.correctiveAction.rootCause,
        correctiveAction: f.correctiveAction.correctiveAction,
        preventiveAction: f.correctiveAction.preventiveAction,
        status: f.correctiveAction.status,
        dueDate: f.correctiveAction.dueDate,
        completionDate: f.correctiveAction.completionDate,
        evidence: f.correctiveAction.evidence,
        assignedTo: f.correctiveAction.assignedTo ? `${f.correctiveAction.assignedTo.firstName} ${f.correctiveAction.assignedTo.lastName}` : null,
        verificationComments: f.correctiveAction.verificationComments,
        verifiedBy: f.correctiveAction.verifiedBy ? `${f.correctiveAction.verifiedBy.firstName} ${f.correctiveAction.verifiedBy.lastName}` : null,
        closedAt: f.correctiveAction.closedAt,
      } : null,
    }));

    return {
      audit: {
        id: audit.id, auditNumber: audit.auditNumber, title: audit.title, description: audit.description,
        auditType: audit.auditType, status: audit.status,
        score: Number(audit.score), maxScore: Number(audit.maxScore), compliancePercentage: Number(audit.compliancePercentage),
        totalQuestions: audit.totalQuestions, answeredQuestions: audit.answeredQuestions, nonComplianceCount: audit.nonComplianceCount,
        scheduledDate: audit.scheduledDate, dueDate: audit.dueDate, actualStart: audit.actualStart, actualEnd: audit.actualEnd,
        createdAt: audit.createdAt, updatedAt: audit.updatedAt,
        auditor: audit.auditor ? { id: audit.auditor.id, name: `${audit.auditor.firstName} ${audit.auditor.lastName}`, email: audit.auditor.email } : null,
        department: audit.department ? { id: audit.department.id, name: audit.department.name, code: audit.department.code } : null,
        location: audit.location ? { id: audit.location.id, name: audit.location.name, code: audit.location.code, address: audit.location.address } : null,
        template: { id: template.id, name: template.name, auditType: template.auditType, version: template.versionNumber, description: template.description, effectiveDate: template.effectiveDate },
        approvedBy: audit.approvedBy ? { id: audit.approvedBy.id, name: `${audit.approvedBy.firstName} ${audit.approvedBy.lastName}` } : null,
        approvedAt: audit.approvedAt,
      },
            categories: Object.values(categories),
      findings,
    };
  }

  /**
   * Generate PDF report for an audit.
   * Returns a Buffer containing the PDF.
   */
  async generatePdf(auditId: string): Promise<Buffer> {
    const reportData = await this.getReportData(auditId);

    // pdfmake bundles the Roboto fonts (base64) inside build/vfs_fonts.js.
    // The Node PdfPrinter accepts font buffers, so the fonts can be read
    // straight out of that virtual file system — no files on disk required.
    const PdfPrinter = require('pdfmake');
    const vfsModule = require('pdfmake/build/vfs_fonts');
    const vfs = vfsModule?.pdfMake?.vfs ?? vfsModule?.vfs ?? vfsModule;
    const font = (name: string) => Buffer.from(vfs[name], 'base64');

    const fonts = {
      Roboto: {
        normal: font('Roboto-Regular.ttf'),
        bold: font('Roboto-Medium.ttf'),
        italics: font('Roboto-Italic.ttf'),
        bolditalics: font('Roboto-MediumItalic.ttf'),
      },
    };

    const printer = new PdfPrinter(fonts);
    const docDefinition = buildPdfDocument(reportData);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  /**
   * Generate Excel report for an audit.
   * Returns a Buffer containing the XLSX file.
   */
  async generateExcel(auditId: string): Promise<Buffer> {
    const reportData = await this.getReportData(auditId);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Report');

    const { audit, categories, findings } = reportData;

    // Header
    worksheet.addRow([{ text: 'AUDIT REPORT', font: { size: 16, bold: true } }]);
    worksheet.addRow([]);
    worksheet.addRow(['Audit Number', audit.auditNumber]);
    worksheet.addRow(['Title', audit.title]);
    worksheet.addRow(['Status', audit.status]);
    worksheet.addRow(['Audit Type', audit.auditType]);
    worksheet.addRow(['Department', audit.department?.name || 'N/A']);
    worksheet.addRow(['Location', audit.location?.name || 'N/A']);
    worksheet.addRow(['Auditor', audit.auditor?.name || 'N/A']);
    worksheet.addRow(['Score', `${audit.score} / ${audit.maxScore}`]);
    worksheet.addRow(['Compliance %', `${audit.compliancePercentage}%`]);
    worksheet.addRow(['Created', new Date(audit.createdAt).toLocaleDateString()]);
    worksheet.addRow([]);

    // Checklist results
    worksheet.addRow([{ text: 'Checklist Results', font: { bold: true } }]);
    worksheet.addRow(['Category', 'Question', 'Answer', 'Comment']);
    for (const cat of categories) {
      for (const q of cat.questions) {
        worksheet.addRow([cat.name, q.questionText, q.answer || '', q.comment || '']);
      }
    }
    worksheet.addRow([]);

    // Findings
    worksheet.addRow([{ text: 'Findings', font: { bold: true } }]);
    if (findings.length > 0) {
      worksheet.addRow(['Finding #', 'Description', 'Severity', 'Status', 'Due Date']);
      for (const f of findings) {
        worksheet.addRow([f.findingNumber, f.description, f.severity, f.status, f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '']);
      }
    } else {
      worksheet.addRow(['No findings recorded']);
    }
    worksheet.addRow([]);

    // Corrective actions
    worksheet.addRow([{ text: 'Corrective Actions', font: { bold: true } }]);
    const actionsWith = findings.filter((f: any) => f.correctiveAction);
    if (actionsWith.length > 0) {
      worksheet.addRow(['Action #', 'Root Cause', 'Corrective Action', 'Status', 'Due Date', 'Assigned To']);
      for (const f of actionsWith) {
        const a = f.correctiveAction;
        worksheet.addRow([a.actionNumber, a.rootCause || '', a.correctiveAction, a.status, a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '', a.assignedTo || '']);
      }
    } else {
      worksheet.addRow(['No corrective actions']);
    }

    return await workbook.xlsx.writeBuffer();
  }
}

/**
 * Builds the pdfmake document definition for an audit report.
 * Consumed by ReportsService.generatePdf().
 */
function buildPdfDocument(report: any): any {
  const { audit, categories, findings } = report;
  const fmt = (value?: Date | string | null) =>
    value ? new Date(value).toLocaleDateString() : '—';

  const content: any[] = [
    { text: 'AUDIT REPORT', style: 'title' },
    { text: `Audit No. ${audit.auditNumber}`, style: 'subtitle' },
    { text: `${audit.title}`, style: 'h2' },
    { text: `Generated on ${new Date().toLocaleString()}`, style: 'small' },
    { text: '\n' },
  ];

  // ─── Audit summary ──────────────────────────────────────────────
  content.push({
    table: {
      widths: ['30%', '70%'],
      body: [
        ['Status', String(audit.status || '').replace(/_/g, ' ')],
        ['Audit Type', audit.auditType || '—'],
        ['Department', audit.department?.name || '—'],
        ['Location', audit.location?.name || '—'],
        ['Auditor', audit.auditor?.name || '—'],
        ['Template', `${audit.template?.name || '—'} (v${audit.template?.version ?? 1})`],
        ['Scheduled Date', fmt(audit.scheduledDate)],
        ['Due Date', fmt(audit.dueDate)],
        ['Score', `${audit.score} / ${audit.maxScore}`],
        ['Compliance', `${audit.compliancePercentage}%`],
        ['Questions Answered', `${audit.answeredQuestions} / ${audit.totalQuestions}`],
        ['Non-Compliances', String(audit.nonComplianceCount ?? 0)],
      ],
    },
    layout: 'lightHorizontalLines',
  });

  if (audit.description) {
    content.push({ text: '\nDescription', style: 'h2' }, { text: audit.description, style: 'small' });
  }

  // ─── Checklist results ──────────────────────────────────────────
  content.push({ text: '\nChecklist Results', style: 'h2' });

  for (const category of categories || []) {
    content.push({ text: category.name || 'Uncategorized', style: 'h3' });
    content.push({
      table: {
        headerRows: 1,
        widths: ['8%', '47%', '20%', '25%'],
        body: [
          [
            { text: '#', style: 'th' },
            { text: 'Question', style: 'th' },
            { text: 'Answer', style: 'th' },
            { text: 'Comment', style: 'th' },
          ],
          ...(category.questions || []).map((q: any, index: number) => [
            String(index + 1),
            q.questionText || '',
            { text: (q.answer || 'not answered').replace(/_/g, ' '), style: answerStyle(q.answer) },
            q.comment || '',
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  // ─── Findings ───────────────────────────────────────────────────
  content.push({ text: '\nFindings', style: 'h2' });
  if ((findings || []).length === 0) {
    content.push({ text: 'No findings recorded.', style: 'small' });
  } else {
    content.push({
      table: {
        headerRows: 1,
        widths: ['14%', '33%', '13%', '13%', '14%', '13%'],
        body: [
          [
            { text: 'Finding #', style: 'th' },
            { text: 'Description', style: 'th' },
            { text: 'Severity', style: 'th' },
            { text: 'Status', style: 'th' },
            { text: 'Responsible', style: 'th' },
            { text: 'Due Date', style: 'th' },
          ],
          ...findings.map((f: any) => [
            f.findingNumber,
            f.description,
            String(f.severity || '').replace(/_/g, ' '),
            String(f.status || '').replace(/_/g, ' '),
            f.responsiblePerson?.name || f.responsibleDepartment?.name || '—',
            fmt(f.dueDate),
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  // ─── Corrective actions ─────────────────────────────────────────
  const actions = (findings || []).filter((f: any) => f.correctiveAction);
  content.push({ text: '\nCorrective Actions', style: 'h2' });
  if (actions.length === 0) {
    content.push({ text: 'No corrective actions recorded.', style: 'small' });
  } else {
    content.push({
      table: {
        headerRows: 1,
        widths: ['12%', '26%', '26%', '14%', '22%'],
        body: [
          [
            { text: 'Action #', style: 'th' },
            { text: 'Root Cause', style: 'th' },
            { text: 'Corrective Action', style: 'th' },
            { text: 'Status', style: 'th' },
            { text: 'Assigned To / Due', style: 'th' },
          ],
          ...actions.map((f: any) => {
            const a = f.correctiveAction;
            return [
              a.actionNumber,
              a.rootCause || '—',
              a.correctiveAction || '',
              String(a.status || '').replace(/_/g, ' '),
              `${a.assignedTo || '—'}\n${fmt(a.dueDate)}`,
            ];
          }),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  // ─── Sign-off block ─────────────────────────────────────────────
  content.push(
    { text: '\n' },
    {
      columns: [
        { text: `Auditor: ${audit.auditor?.name || '____________________'}`, style: 'small' },
        { text: `Approved By: ${audit.approvedBy?.name || '____________________'}`, style: 'small' },
        { text: `Date: ${fmt(audit.approvedAt || audit.actualEnd)}`, style: 'small' },
      ],
    },
  );

  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Audit Management System  |  ${audit.auditNumber}  |  Page ${currentPage} of ${pageCount}`,
      style: 'small',
      alignment: 'center',
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
    styles: {
      title: { fontSize: 20, bold: true, alignment: 'center' },
      subtitle: { fontSize: 12, alignment: 'center', color: '#666666' },
      h2: { fontSize: 13, bold: true, margin: [0, 8, 0, 4] },
      h3: { fontSize: 11, bold: true, margin: [0, 6, 0, 2], color: '#1f4e79' },
      th: { bold: true, fontSize: 9, fillColor: '#eef2f7' },
      small: { fontSize: 9 },
      pass: { color: '#1a7f37', fontSize: 9 },
      fail: { color: '#b91c1c', fontSize: 9 },
    },
    defaultStyle: { fontSize: 9 },
    content,
  };
}

/** Colour-codes a checklist answer inside the PDF table. */
function answerStyle(answer?: string | null): string {
  if (answer === 'compliant') return 'pass';
  if (answer === 'non_compliant') return 'fail';
  return 'small';
}


