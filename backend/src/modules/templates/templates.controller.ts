import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditType } from '../../shared/enums';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit templates' })
  @ApiQuery({ name: 'auditType', required: false, enum: AuditType })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('auditType') auditType?: AuditType,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const active = isActive === undefined || isActive === '' ? undefined : isActive === 'true';
    return this.templatesService.findAll({ auditType, departmentId, isActive: active, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template with categories and questions' })
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new audit template' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id/clone')
  @ApiOperation({ summary: 'Clone a template to create a new version' })
  async clone(@Param('id') id: string) {
    return this.templatesService.clone(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  async remove(@Param('id') id: string) {
    await this.templatesService.remove(id);
  }

  // ─── Categories ──────────────────────────────────────────────
  @Get(':id/categories')
  @ApiOperation({ summary: 'Get template categories' })
  async getCategories(@Param('id') id: string) {
    return this.templatesService.getCategories(id);
  }

  @Post(':id/categories')
  @ApiOperation({ summary: 'Create a category in a template' })
  async createCategory(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.createCategory(id, body);
  }

  @Patch(':id/categories/:categoryId')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(@Param('id') id: string, @Param('categoryId') categoryId: string, @Body() body: any) {
    return this.templatesService.updateCategory(id, categoryId, body);
  }

  @Delete(':id/categories/:categoryId')
  @ApiOperation({ summary: 'Delete a category' })
  async removeCategory(@Param('id') id: string, @Param('categoryId') categoryId: string) {
    await this.templatesService.removeCategory(id, categoryId);
  }

  // ─── Questions ──────────────────────────────────────────────
  @Get(':id/questions')
  @ApiOperation({ summary: 'Get template questions' })
  async getQuestions(@Param('id') id: string) {
    return this.templatesService.getQuestions(id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Create a question in a template' })
  async createQuestion(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.createQuestion(id, body);
  }

  @Patch(':id/questions/:questionId')
  @ApiOperation({ summary: 'Update a question' })
  async updateQuestion(@Param('id') id: string, @Param('questionId') questionId: string, @Body() body: any) {
    return this.templatesService.updateQuestion(id, questionId, body);
  }

  @Delete(':id/questions/:questionId')
  @ApiOperation({ summary: 'Delete a question' })
  async removeQuestion(@Param('id') id: string, @Param('questionId') questionId: string) {
    await this.templatesService.removeQuestion(id, questionId);
  }
}
