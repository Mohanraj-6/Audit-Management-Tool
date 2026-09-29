import { Controller, Get, Post, Body, Patch, Param, Query, Delete } from '@nestjs/common';
import { AuditsService } from './audits.service';
import {
  CreateAuditDto,
  AssignAuditUsersDto,
  NotifyAuditAssigneesDto,
  UpdateAuditDto,
  ChecklistQuestionDto,
  UpdateChecklistQuestionDto,
  EmailChecklistDto,
} from './dto/create-audit.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditStatus } from '../../shared/enums';

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audits' })
  @ApiQuery({ name: 'status', required: false, enum: AuditStatus })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'auditorId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async findAll(
    @Query('status') status?: AuditStatus,
    @Query('departmentId') departmentId?: string,
    @Query('auditorId') auditorId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditsService.findAll({ status, departmentId, auditorId, search, dateFrom, dateTo });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats() {
    return this.auditsService.getStats();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get dashboard chart data' })
  async getCharts() {
    return this.auditsService.getDashboardCharts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit' })
  async findOne(@Param('id') id: string) {
    return this.auditsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new audit' })
  async create(@Body() dto: CreateAuditDto) {
    return this.auditsService.create(dto);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start an audit (Draft → In Progress)' })
  async startAudit(@Param('id') id: string, @Body() body?: { auditorId?: string }) {
    return this.auditsService.startAudit(id, body?.auditorId);
  }

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Get the audit checklist' })
  async getChecklist(@Param('id') id: string) {
    return this.auditsService.getChecklist(id);
  }

  @Post(':id/answers/:questionId')
  @ApiOperation({ summary: 'Save an answer to a checklist question' })
  async saveAnswer(
    @Param('id') auditId: string,
    @Param('questionId') questionId: string,
    @Body() body: { answer: string; comment?: string; evidenceIds?: string[] },
  ) {
    return this.auditsService.saveAnswer(auditId, questionId, body.answer, body.comment, body.evidenceIds);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit an audit for review' })
  async submitAudit(@Param('id') id: string) {
    return this.auditsService.submitAudit(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve an audit (manager review)' })
  async approveAudit(@Param('id') id: string, @Body() body?: { comments?: string }) {
    return this.auditsService.approveAudit(id, body?.comments);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an audit (return to auditor)' })
  async rejectAudit(@Param('id') id: string, @Body() body: { comments?: string }) {
    return this.auditsService.rejectAudit(id, body?.comments);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an approved audit' })
  async closeAudit(@Param('id') id: string) {
    return this.auditsService.closeAudit(id);
  }

  @Get(':id/assignees')
  @ApiOperation({ summary: 'Users allotted to this audit' })
  async getAssignees(@Param('id') id: string) {
    return this.auditsService.getAssignees(id);
  }

  @Post(':id/assignees')
  @ApiOperation({ summary: 'Allot users to the audit (emails them from the auditor)' })
  async assignUsers(@Param('id') id: string, @Body() dto: AssignAuditUsersDto) {
    return this.auditsService.assignUsers(id, dto.userIds, {
      notify: dto.notify,
      message: dto.message,
    });
  }

  @Post(':id/notify-assignees')
  @ApiOperation({ summary: 'Re-send the allotment email to the allotted users' })
  async notifyAssignees(@Param('id') id: string, @Body() dto: NotifyAuditAssigneesDto) {
    return this.auditsService.notifyAssignees(id, {
      userIds: dto?.userIds,
      message: dto?.message,
    });
  }

  @Delete(':id/assignees/:userId')
  @ApiOperation({ summary: 'Remove a user from the allotted users' })
  async removeAssignee(@Param('id') id: string, @Param('userId') userId: string) {
    return this.auditsService.removeAssignee(id, userId);
  }

  @Post(':id/checklist/email')
  @ApiOperation({ summary: 'Email the current checklist to allotted users' })
  async emailChecklist(@Param('id') id: string, @Body() dto: EmailChecklistDto) {
    return this.auditsService.emailChecklist(id, dto?.message);
  }

  @Post(':id/checklist/questions')
  @ApiOperation({ summary: 'Add a question to the audit checklist template' })
  async addChecklistQuestion(@Param('id') id: string, @Body() dto: ChecklistQuestionDto) {
    return this.auditsService.addChecklistQuestion(id, dto);
  }

  @Patch(':id/checklist/questions/:questionId')
  @ApiOperation({ summary: 'Edit an audit checklist question' })
  async updateChecklistQuestion(@Param('id') id: string, @Param('questionId') questionId: string, @Body() dto: UpdateChecklistQuestionDto) {
    return this.auditsService.updateChecklistQuestion(id, questionId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update audit details' })
  async update(@Param('id') id: string, @Body() dto: UpdateAuditDto) {
    return this.auditsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an audit (only drafts allowed)' })
  async remove(@Param('id') id: string) {
    return this.auditsService.delete(id);
  }
}
