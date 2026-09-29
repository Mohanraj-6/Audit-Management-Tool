import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query('search') search?: string) {
    return this.departmentsService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single department' })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  async create(@Body() body: { name: string; code: string; description?: string; managerId?: string }) {
    return this.departmentsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  async update(@Param('id') id: string, @Body() body: { name?: string; code?: string; description?: string; managerId?: string }) {
    return this.departmentsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department' })
  async remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}