import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsNumber, Min, Max, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditStatus, AuditType, QuestionType } from '../../../shared/enums';

export class CreateAuditDto {
  @ApiProperty({ example: 'Q1 Safety Audit - Main Facility' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Quarterly safety audit of the main facility' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-template-id' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ example: 'uuid-dept-id' })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({ example: 'uuid-location-id' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ example: AuditType.Safety })
  @IsOptional()
  @IsEnum(AuditType)
  auditType?: AuditType;

  @ApiPropertyOptional({ example: '2026-01-15T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '2026-01-22T17:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'uuid-user-id', description: 'Auditor assigned to the audit' })
  @IsOptional()
  @IsUUID()
  auditorId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-user-id'],
    description: 'Users allotted to this audit — they are emailed by the auditor',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  @ApiPropertyOptional({
    default: true,
    description: 'Send the allotment email from the auditor to the allotted users',
  })
  @IsOptional()
  @IsBoolean()
  notifyAssignees?: boolean;

  @ApiPropertyOptional({ example: 'Please complete the checklist before the due date.' })
  @IsOptional()
  @IsString()
  assignmentMessage?: string;
}

export class AssignAuditUsersDto {
  @ApiProperty({ type: [String], example: ['uuid-user-id'], description: 'Users to allot' })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiPropertyOptional({ default: true, description: 'Email the newly allotted users' })
  @IsOptional()
  @IsBoolean()
  notify?: boolean;

  @ApiPropertyOptional({ example: 'Audit starts on Monday — please be available.' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class NotifyAuditAssigneesDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Specific allotted users to email (omit to email everyone allotted)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({ example: 'Reminder: the audit checklist is due this week.' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateAuditDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsUUID()
  locationId?: string;

  @IsOptional() @IsDateString()
  scheduledDate?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsEnum(AuditStatus)
  status?: AuditStatus;
}

export class SaveAnswerDto {
  @ApiProperty({ enum: ['compliant', 'non_compliant', 'observation', 'not_applicable'], example: 'compliant' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ example: 'All exits were clearly marked' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: [String], example: ['uuid-evidence-1', 'uuid-evidence-2'] })
  @IsOptional()
  @IsArray()
  evidenceIds?: string[];
}

export class StartAuditDto {
  @ApiPropertyOptional({ example: 'uuid-user-id', description: 'Auditor user ID' })
  @IsOptional()
  @IsUUID()
  auditorId?: string;

}

export class ChecklistQuestionDto {
  @IsString()
  questionText: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateChecklistQuestionDto extends ChecklistQuestionDto {}

export class EmailChecklistDto {
  @IsOptional()
  @IsString()
  message?: string;
}
