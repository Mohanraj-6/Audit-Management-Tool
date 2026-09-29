import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActionStatus } from '../../../shared/enums';

export class CreateCorrectiveActionDto {
  @ApiProperty({ example: 'uuid-finding-id' })
  @IsUUID()
  findingId: string;

  @ApiProperty({ example: 'Improper storage of hazardous materials led to spill risk' })
  @IsString()
  rootCause: string;

  @ApiProperty({ example: 'Reorganize storage area and install proper labeling' })
  @IsString()
  correctiveAction: string;

  @ApiPropertyOptional({ example: 'Implement monthly safety checks and staff training' })
  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @ApiProperty({ example: 'uuid-user-id' })
  @IsUUID()
  assignedToId: string;

  @ApiProperty({ example: '2026-02-15T17:00:00Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  evidence?: any[];
}

export class UpdateCorrectiveActionDto {
  @IsOptional() @IsString()
  rootCause?: string;

  @IsOptional() @IsString()
  correctiveAction?: string;

  @IsOptional() @IsString()
  preventiveAction?: string;

  @IsOptional() @IsUUID()
  assignedToId?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsDateString()
  completionDate?: string;

  @IsOptional() @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional() @IsArray()
  evidence?: any[];

  @IsOptional() @IsString()
  verificationComments?: string;
}
