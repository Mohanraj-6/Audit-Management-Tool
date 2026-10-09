import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit log entries' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'recordType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('recordType') recordType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogsService.findAll({
      userId,
      action,
      recordType,
      dateFrom,
      dateTo,
      page: page || 1,
      limit: limit || 50,
    });
  }
}