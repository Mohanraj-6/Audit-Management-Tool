import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FindingSeverity } from '../../../shared/enums';

export class CreateFindingDto {
  @ApiProperty({ example: 'uuid-audit-id' })
  @IsUUID()
  auditId: string;

  @ApiPropertyOptional({ example: 'uuid-question-id' })
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional({ example: 'Workplace Safety' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'Emergency exits are not clearly marked on the second floor.' })
  @IsString()
  description: string;

  @ApiProperty({ enum: FindingSeverity, example: FindingSeverity.Major })
  @IsEnum(FindingSeverity)
  severity: FindingSeverity;

  @ApiPropertyOptional({ example: 'uuid-dept-id' })
  @IsOptional()
  @IsUUID()
  responsibleDepartmentId?: string;

  @ApiPropertyOptional({ example: 'uuid-user-id' })
  @IsOptional()
  @IsUUID()
  responsiblePersonId?: string;

  @ApiPropertyOptional({ example: '2026-01-30T17:00:00Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: [Object], description: 'Evidence file metadata' })
  @IsOptional()
  @IsArray()
  evidence?: any[];
}

export class UpdateFindingDto {
  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @IsOptional() @IsUUID()
  responsibleDepartmentId?: string;

  @IsOptional() @IsUUID()
  responsiblePersonId?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsEnum(FindingSeverity)
  status?: string;

  @IsOptional() @IsArray()
  evidence?: any[];

  @IsOptional() @IsString()
  rootCause?: string;
}
