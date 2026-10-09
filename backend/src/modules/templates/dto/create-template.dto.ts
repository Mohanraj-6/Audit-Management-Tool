import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditType } from '../../../shared/enums';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Annual Safety Audit' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AuditType, example: AuditType.Safety })
  @IsEnum(AuditType)
  auditType: AuditType;

  @ApiPropertyOptional({ example: 'uuid-dept-id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ example: 'This template covers all workplace safety requirements.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-user-id' })
  @IsOptional()
  @IsUUID()
  createdById?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Workplace Safety' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Questions about workplace safety' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  sortOrder?: number;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'Are emergency exits clearly marked?' })
  @IsString()
  questionText: string;

  @ApiPropertyOptional({ example: 'uuid-category-id' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 'yes_no', description: 'Question type' })
  @IsString()
  questionType: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: ['Compliant', 'Non-Compliant', 'Observation'] })
  @IsOptional()
  options?: any[];
}
