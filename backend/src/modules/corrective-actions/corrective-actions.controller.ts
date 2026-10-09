import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { CorrectiveActionsService } from './corrective-actions.service';
import { CreateCorrectiveActionDto, UpdateCorrectiveActionDto } from './dto/create-corrective-action.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ActionStatus } from '../../shared/enums';

@ApiTags('corrective-actions')
@Controller('corrective-actions')
export class CorrectiveActionsController {
  constructor(private readonly correctiveActionsService: CorrectiveActionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all corrective actions' })
  @ApiQuery({ name: 'status', required: false, enum: ActionStatus })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('status') status?: ActionStatus,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.correctiveActionsService.findAll({ status, assignedToId, search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get corrective action statistics' })
  async getStats() {
    return this.correctiveActionsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single corrective action' })
  async findOne(@Param('id') id: string) {
    return this.correctiveActionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a corrective action' })
  async create(@Body() dto: CreateCorrectiveActionDto) {
    return this.correctiveActionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a corrective action' })
  async update(@Param('id') id: string, @Body() dto: UpdateCorrectiveActionDto) {
    return this.correctiveActionsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change corrective action status' })
  async changeStatus(@Param('id') id: string, @Body() body: { status: ActionStatus }) {
    return this.correctiveActionsService.changeStatus(id, body.status);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit corrective action for verification' })
  async submitForVerification(@Param('id') id: string, @Body() body?: { evidence?: any[] }) {
    return this.correctiveActionsService.submitForVerification(id, body?.evidence);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify and close a corrective action (auditor/manager only)' })
  async verify(@Param('id') id: string, @Body() body: { comments?: string }) {
    return this.correctiveActionsService.verify(id, body?.comments);
  }
}
