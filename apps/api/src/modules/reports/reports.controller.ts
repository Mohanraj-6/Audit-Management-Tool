/**
 * Reports Controller — exposes the audit report data plus PDF/Excel exports.
 *
 *   GET /api/reports/audits/:id         → full report data (JSON)
 *   GET /api/reports/audits/:id/pdf     → PDF file download
 *   GET /api/reports/audits/:id/excel   → XLSX file download
 */

import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('audits/:id')
  @ApiOperation({ summary: 'Get the complete report data for an audit' })
  async getReport(@Param('id') id: string) {
    return this.reportsService.getReportData(id);
  }

  @Get('audits/:id/pdf')
  @ApiOperation({ summary: 'Download the audit report as PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reportsService.getReportData(id);
    const pdf = await this.reportsService.generatePdf(id);
    const fileName = `audit-report-${report.audit.auditNumber}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(pdf.length),
    });
    res.end(pdf);
  }

  @Get('audits/:id/excel')
  @ApiOperation({ summary: 'Download the audit report as Excel' })
  async downloadExcel(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reportsService.getReportData(id);
    const xlsx = await this.reportsService.generateExcel(id);
    const fileName = `audit-report-${report.audit.auditNumber}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(xlsx.length),
    });
    res.end(Buffer.from(xlsx));
  }
}
