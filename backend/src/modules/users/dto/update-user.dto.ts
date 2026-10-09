import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payload for PATCH /api/users/:id
 * Every field is optional — only the provided fields are updated.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'uuid-role-id' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ example: 'uuid-dept-id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
