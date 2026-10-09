import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@company.com', description: 'Unique email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'uuid-role-id', description: 'Role ID' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ example: 'uuid-dept-id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}