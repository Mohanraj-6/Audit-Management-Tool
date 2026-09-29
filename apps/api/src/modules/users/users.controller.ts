/**
 * Users Controller — REST endpoints for user management.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../../shared/enums';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('role') role?: UserRole,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const active = isActive === undefined || isActive === '' ? undefined : isActive === 'true';
    return this.usersService.findAll({ role, departmentId, isActive: active, search });
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a user' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
