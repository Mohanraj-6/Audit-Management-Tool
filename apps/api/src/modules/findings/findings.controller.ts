import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { FindingsService } from './findings.service';
import { CreateFindingDto, UpdateFindingDto } from './dto/create-finding.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FindingSeverity, FindingStatus } from '../../shared/enums';

@ApiTags('findings')
@Controller('findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all findings' })
  @ApiQuery({ name: 'auditId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: FindingStatus })
  @ApiQuery({ name: 'severity', required: false, enum: FindingSeverity })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('auditId') auditId?: string,
    @Query('status') status?: FindingStatus,
    @Query('severity') severity?: FindingSeverity,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
  ) {
    return this.findingsService.findAll({ auditId, status, severity, departmentId, search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get finding statistics' })
  async getStats() {
    return this.findingsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single finding' })
  async findOne(@Param('id') id: string) {
    return this.findingsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a finding' })
  async create(@Body() dto: CreateFindingDto) {
    return this.findingsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a finding' })
  async update(@Param('id') id: string, @Body() dto: UpdateFindingDto) {
    return this.findingsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change finding status' })
  async changeStatus(@Param('id') id: string, @Body() body: { status: FindingStatus }) {
    return this.findingsService.changeStatus(id, body.status);
  }
}
