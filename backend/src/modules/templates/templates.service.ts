/**
 * Templates Service — manages audit template creation, categorization,
 * questions, and version control.
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTemplate } from '../../entities/audit-template.entity';
import { TemplateCategory } from '../../entities/template-category.entity';
import { TemplateQuestion } from '../../entities/template-question.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateUUID, getCurrentYear } from '../../shared/utils/helpers';
import { AuditType } from '../../shared/enums';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(AuditTemplate)
    private templateRepository: Repository<AuditTemplate>,
    @InjectRepository(TemplateCategory)
    private categoryRepository: Repository<TemplateCategory>,
    @InjectRepository(TemplateQuestion)
    private questionRepository: Repository<TemplateQuestion>,
    private AuditLogsService: AuditLogsService,
  ) {}

  async findAll(options?: { auditType?: AuditType; departmentId?: string; isActive?: boolean; search?: string }) {
    const qb = this.templateRepository.createQueryBuilder('t')
      .leftJoinAndSelect('t.department', 'department')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .leftJoinAndSelect('t.categories', 'categories')
      .leftJoinAndSelect('t.questions', 'questions')
      .orderBy('t.versionNumber', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    if (options?.auditType) qb.andWhere('t.auditType = :type', { type: options.auditType });
    if (options?.departmentId) qb.andWhere('t.departmentId = :deptId', { deptId: options.departmentId });
    if (options?.isActive !== undefined) qb.andWhere('t.isActive = :isActive', { isActive: options.isActive });
    if (options?.search) {
      qb.andWhere('(t.name ILIKE :search OR t.description ILIKE :search)', { search: `%${options.search}%` });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<AuditTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['department', 'createdBy', 'categories', 'categories.questions', 'parentTemplate'],
    });
    if (!template) throw new NotFoundException(`Template with ID ${id} not found`);
    return template;
  }

  async create(dto: CreateTemplateDto): Promise<AuditTemplate> {
    const existing = await this.templateRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A template with this name already exists');

    const year = getCurrentYear();
    const count = await this.templateRepository.count();
    const templateNumber = `TMPL-${year}-${String(count + 1).padStart(4, '0')}`;

    const template = this.templateRepository.create({
      id: generateUUID(),
      templateNumber,
      name: dto.name,
      auditType: dto.auditType,
      departmentId: dto.departmentId,
      versionNumber: 1,
      effectiveDate: dto.effectiveDate,
      description: dto.description,
      isActive: true,
      createdById: dto.createdById || '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
    });

    const saved = await this.templateRepository.save(template);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'AuditTemplate', saved.id, null,
      { id: saved.id, name: saved.name, templateNumber: saved.templateNumber },
    );
    return saved;
  }

  async update(id: string, dto: Partial<CreateTemplateDto>): Promise<AuditTemplate> {
    const template = await this.findOne(id);
    const oldValues = { name: template.name, description: template.description, isActive: template.isActive };
    Object.assign(template, dto);
    template.updatedAt = new Date();
    const saved = await this.templateRepository.save(template);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'AuditTemplate', saved.id, oldValues,
      { name: saved.name, description: saved.description },
    );
    return saved;
  }

  async clone(id: string): Promise<AuditTemplate> {
        const original = await this.findOne(id);
    const year = getCurrentYear();
    const count = await this.templateRepository.count();
    const templateNumber = `TMPL-${year}-${String(count + 1).padStart(4, '0')}`;

    const newTemplate = this.templateRepository.create({
      id: generateUUID(),
      templateNumber,
      name: `${original.name} (v${original.versionNumber + 1})`,
      auditType: original.auditType,
      departmentId: original.departmentId,
      versionNumber: original.versionNumber + 1,
      effectiveDate: new Date().toISOString().split('T')[0],
      description: original.description,
      isActive: true,
      createdById: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
      parentTemplateId: original.id,
    });

    const saved = await this.templateRepository.save(newTemplate);

    // Clone categories and questions
    const categories = await this.categoryRepository.find({ where: { templateId: original.id }, relations: ['questions'] });
    for (const cat of categories) {
      const newCat = this.categoryRepository.create({
        id: generateUUID(),
        templateId: saved.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
      });
      const savedCat = await this.categoryRepository.save(newCat);

      if (cat.questions && cat.questions.length) {
        const questions = cat.questions.map((q) =>
          this.questionRepository.create({
            id: generateUUID(),
            templateId: saved.id,
            categoryId: savedCat.id,
            questionText: q.questionText,
            questionType: q.questionType,
            isMandatory: q.isMandatory,
            weight: q.weight,
            sortOrder: q.sortOrder,
            options: q.options,
          }),
        );
        await this.questionRepository.save(questions);
      }
    }

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'AuditTemplate', saved.id, null,
      { action: 'cloned_from', clonedFromId: original.id, templateNumber: saved.templateNumber },
    );
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
        await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'deleted', 'AuditTemplate', id, { name: template.name }, null,
    );
  }

  // ─── Categories ─────────────────────────────────────────────────

  async getCategories(templateId: string) {
    return this.categoryRepository.find({
      where: { templateId },
      relations: ['questions'],
      order: { sortOrder: 'ASC' },
    });
  }

  async createCategory(templateId: string, dto: any): Promise<TemplateCategory> {
    const count = await this.categoryRepository.count({ where: { templateId } });
    const cat = this.categoryRepository.create({
      id: generateUUID(),
      templateId,
      name: dto.name,
      description: dto.description,
      sortOrder: dto.sortOrder ?? count,
    });
    return this.categoryRepository.save(cat);
  }

  async updateCategory(templateId: string, categoryId: string, dto: any): Promise<TemplateCategory> {
    const cat = await this.categoryRepository.findOne({ where: { id: categoryId, templateId } });
    if (!cat) throw new NotFoundException('Category not found');
    Object.assign(cat, dto);
    return this.categoryRepository.save(cat);
  }

  async removeCategory(templateId: string, categoryId: string): Promise<void> {
    const cat = await this.categoryRepository.findOne({ where: { id: categoryId, templateId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.categoryRepository.remove(cat);
  }

  // ─── Questions ──────────────────────────────────────────────────

  async getQuestions(templateId: string) {
    return this.questionRepository.find({
      where: { templateId },
      relations: ['category'],
      order: { sortOrder: 'ASC' },
    });
  }

  async createQuestion(templateId: string, dto: any): Promise<TemplateQuestion> {
    const count = await this.questionRepository.count({ where: { templateId } });
    const question = this.questionRepository.create({
      id: generateUUID(),
      templateId,
      categoryId: dto.categoryId,
      questionText: dto.questionText,
      questionType: dto.questionType,
      isMandatory: dto.isMandatory ?? true,
      weight: dto.weight ?? 1,
      sortOrder: dto.sortOrder ?? count,
      options: dto.options ?? [],
    });
    return this.questionRepository.save(question);
  }

  async updateQuestion(templateId: string, questionId: string, dto: any): Promise<TemplateQuestion> {
    const q = await this.questionRepository.findOne({ where: { id: questionId, templateId } });
    if (!q) throw new NotFoundException('Question not found');
    Object.assign(q, dto);
    return this.questionRepository.save(q);
  }

  async removeQuestion(templateId: string, questionId: string): Promise<void> {
    const q = await this.questionRepository.findOne({ where: { id: questionId, templateId } });
    if (!q) throw new NotFoundException('Question not found');
    await this.questionRepository.remove(q);
  }
}



