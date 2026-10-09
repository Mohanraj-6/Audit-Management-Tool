/**
 * Audits Service — handles the full audit lifecycle:
 * Creation → Start → Checklist → Findings → Submit → Review → Approve/Reject → Close
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Audit } from '../../entities/audit.entity';
import { AuditAssignee } from '../../entities/audit-assignee.entity';
import { AuditAnswer } from '../../entities/audit-answer.entity';
import { Finding } from '../../entities/finding.entity';
import { AuditTemplate } from '../../entities/audit-template.entity';
import { TemplateQuestion } from '../../entities/template-question.entity';
import { User } from '../../entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService, AuditAssignmentMailSummary } from '../mail/mail.service';
import { personName } from '../mail/mail-templates';
import { generateUUID, getCurrentYear } from '../../shared/utils/helpers';
import { AuditStatus, AnswerOption, AuditType, NotificationType, QuestionType } from '../../shared/enums';
import { CreateAuditDto } from './dto/create-audit.dto';

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(Audit) private auditRepository: Repository<Audit>,
    @InjectRepository(AuditAnswer) private answerRepository: Repository<AuditAnswer>,
    @InjectRepository(Finding) private findingRepository: Repository<Finding>,
    @InjectRepository(AuditTemplate) private templateRepository: Repository<AuditTemplate>,
    @InjectRepository(TemplateQuestion) private questionRepository: Repository<TemplateQuestion>,
    @InjectRepository(AuditAssignee) private assigneeRepository: Repository<AuditAssignee>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private AuditLogsService: AuditLogsService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  /**
   * Generate a sequential audit number: AUD-2026-0001
   */
  private async generateAuditNumber(): Promise<string> {
    const year = getCurrentYear();
    const count = await this.auditRepository.count({});
        return `AUD-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get all audits with filtering and pagination.
   */
  async findAll(options?: {
    status?: AuditStatus;
    departmentId?: string;
    auditorId?: string;
    auditType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<Audit[]> {
    const qb = this.auditRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.template', 'template')
      .leftJoinAndSelect('audit.auditor', 'auditor')
      .leftJoinAndSelect('audit.department', 'department')
      .leftJoinAndSelect('audit.location', 'location')
      .leftJoinAndSelect('audit.findings', 'findings');

    if (options?.status) qb.andWhere('audit.status = :status', { status: options.status });
    if (options?.departmentId) qb.andWhere('audit.departmentId = :deptId', { deptId: options.departmentId });
    if (options?.auditorId) qb.andWhere('audit.auditorId = :auditorId', { auditorId: options.auditorId });
    if (options?.auditType) qb.andWhere('audit.auditType = :type', { type: options.auditType });
    if (options?.dateFrom) qb.andWhere('audit.createdAt >= :from', { from: new Date(options.dateFrom) });
    if (options?.dateTo) qb.andWhere('audit.createdAt <= :to', { to: new Date(options.dateTo) });
    if (options?.search) {
      qb.andWhere('(audit.title ILIKE :search OR audit.auditNumber ILIKE :search)', { search: `%${options.search}%` });
    }

    qb.orderBy('audit.createdAt', 'DESC');
    if (options?.limit) qb.limit(options.limit);
    if (options?.offset) qb.offset(options.offset);

        return qb.getMany();
  }

  /**
   * Get a single audit with full details (template, answers, findings).
   */
  async findOne(id: string): Promise<Audit> {
    const audit = await this.auditRepository.findOne({
      where: { id },
      relations: [
        'template', 'template.categories', 'template.categories.questions',
        'auditor', 'department', 'location',
        'answers', 'answers.question', 'answers.finding', 'findings',
        'assignees', 'assignees.user', 'assignees.assignedBy',
      ],
    });
    if (!audit) throw new NotFoundException(`Audit with ID ${id} not found`);
    return audit;
  }

  /**
   * Create a new audit from a template.
   */
  async create(dto: CreateAuditDto): Promise<Audit> {
    const template = await this.templateRepository.findOne({
      where: { id: dto.templateId },
      relations: ['department', 'categories', 'categories.questions'],
    });
    if (!template) throw new NotFoundException(`Template with ID ${dto.templateId} not found`);

    // Resolve the allotted users first so an invalid selection fails before
    // the audit row is created.
    const assigneeUsers = await this.resolveUsers(dto.assigneeIds);

    const auditNumber = await this.generateAuditNumber();

    const audit = this.auditRepository.create({
      id: generateUUID(),
      auditNumber,
      templateId: dto.templateId,
      title: dto.title,
      description: dto.description,
      auditType: dto.auditType || template.auditType,
      departmentId: dto.departmentId,
      locationId: dto.locationId,
      auditorId: dto.auditorId || '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: AuditStatus.Draft,
      score: 0,
      maxScore: 0,
      compliancePercentage: 0,
      totalQuestions: 0,
      answeredQuestions: 0,
      nonComplianceCount: 0,
      createdById: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
    });

    // Count questions from template
    audit.totalQuestions = template.questions ? template.questions.length : 0;

    const saved = await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'Audit', saved.id, null,
      { id: saved.id, auditNumber: saved.auditNumber, title: saved.title, templateId: saved.templateId },
    );

    const created = await this.findOne(saved.id);

    // Allot the selected users: in-app notification + email from the auditor.
    if (assigneeUsers.length > 0) {
      const assignment = await this.assignResolvedUsers(created, assigneeUsers, {
        notify: dto.notifyAssignees !== false,
        message: dto.assignmentMessage,
      });
      (created as any).assignment = assignment;
    }

        return created;
  }

  /**
   * The users allotted to an audit.
   */
  async getAssignees(auditId: string): Promise<AuditAssignee[]> {
    await this.findOne(auditId);
    return this.assigneeRepository.find({
      where: { auditId },
      relations: ['assignedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Allots users to an audit (the auditor's "allot users" action).
   * Every newly allotted user gets an in-app notification and an email that is
   * sent from the auditor.
   */
  async assignUsers(
    auditId: string,
    userIds: string[],
    options?: { notify?: boolean; message?: string },
  ) {
    const users = await this.resolveUsers(userIds);
    if (users.length === 0) throw new BadRequestException('Select at least one user to allot');

    const audit = await this.findOne(auditId);
    return this.assignResolvedUsers(audit, users, options);
  }

  /**
   * Removes a user from the list of allotted users.
   */
  async removeAssignee(auditId: string, userId: string): Promise<{ removed: boolean }> {
    const existing = await this.assigneeRepository.findOne({ where: { auditId, userId } });
    if (!existing) throw new NotFoundException('That user is not allotted to this audit');

    await this.assigneeRepository.remove(existing);
    return { removed: true };
  }

  /**
   * (Re)sends the allotment email from the auditor to the allotted users.
   */
  async notifyAssignees(
    auditId: string,
    options?: { userIds?: string[]; message?: string },
  ): Promise<AuditAssignmentMailSummary> {
    const audit = await this.findOne(auditId);
    const assignees = await this.assigneeRepository.find({ where: { auditId } });
    if (assignees.length === 0) {
      throw new BadRequestException('No users are allotted to this audit yet');
    }

    const selected = options?.userIds?.length
      ? assignees.filter((row) => (options.userIds as string[]).includes(row.userId))
      : assignees;
    if (selected.length === 0) {
      throw new BadRequestException('None of the selected users are allotted to this audit');
    }

    return this.emailAssignees(audit, selected, options?.message);
  }

  // ─── Allotment helpers ─────────────────────────────────────────────

  /** Loads users by id, failing when any id is unknown. */
  private async resolveUsers(userIds?: string[]): Promise<User[]> {
    const unique = Array.from(new Set((userIds || []).filter(Boolean)));
    if (unique.length === 0) return [];

    const users = await this.userRepository.find({ where: { id: In(unique) } });
    if (users.length !== unique.length) {
      const found = new Set(users.map((user) => user.id));
      const missing = unique.filter((id) => !found.has(id));
      throw new NotFoundException(`User(s) not found: ${missing.join(', ')}`);
    }
    return users;
  }

  /**
   * Creates the allotment rows and, unless notify is false, notifies the newly
   * allotted users in-app and by email from the auditor.
   */
  private async assignResolvedUsers(
    audit: Audit,
    users: User[],
    options?: { notify?: boolean; message?: string },
  ) {
    const existing = await this.assigneeRepository.find({ where: { auditId: audit.id } });
    const alreadyAllotted = new Set(existing.map((row) => row.userId));
    const added = users.filter((user) => !alreadyAllotted.has(user.id));

    for (const user of added) {
      await this.assigneeRepository.save(
        this.assigneeRepository.create({
          id: generateUUID(),
          auditId: audit.id,
          userId: user.id,
          assignedById: audit.auditorId,
          emailSentAt: null,
        }),
      );
    }

    const auditorName = personName(audit.auditor) || 'the auditor';
    let email: AuditAssignmentMailSummary | null = null;

    if (added.length > 0) {
      // In-app notification for each newly allotted user.
      await this.notificationsService.createBulk(
        added.map((user) => ({
          userId: user.id,
          type: NotificationType.AuditAssigned,
          title: 'Audit allotted to you',
          message: `${auditorName} allotted audit ${audit.auditNumber} — ${audit.title}`,
          relatedId: audit.id,
          relatedType: 'Audit',
          metadata: { auditNumber: audit.auditNumber, allottedBy: audit.auditorId },
        })),
      );

      // Email from the auditor.
      if (options?.notify !== false) {
        const rows = await this.assigneeRepository.find({ where: { auditId: audit.id } });
        const addedIds = new Set(added.map((user) => user.id));
        email = await this.emailAssignees(
          audit,
          rows.filter((row) => addedIds.has(row.userId)),
          options?.message,
        );
      }

      await this.AuditLogsService.logAction(audit.auditorId, 'updated', 'Audit', audit.id, null, {
        allottedUserIds: added.map((user) => user.id),
        emailsAttempted: email?.attempted ?? 0,
      });
    }

    return {
      auditId: audit.id,
      allottedUsers: users.map((user) => ({
        id: user.id,
        name: personName(user),
        email: user.email,
      })),
      newlyAllottedUsers: added.map((user) => ({
        id: user.id,
        name: personName(user),
        email: user.email,
      })),
      email,
    };
  }

  /**
   * Sends the allotment email from the auditor and records when it went out.
   */
  private async emailAssignees(
    audit: Audit,
    assignees: AuditAssignee[],
    message?: string,
  ): Promise<AuditAssignmentMailSummary> {
    const auditor = await this.userRepository.findOne({ where: { id: audit.auditorId } });
    if (!auditor) throw new NotFoundException('The auditor of this audit no longer exists');

    const recipients = assignees
      .filter((row) => row.user)
      .map((row) => ({
        id: row.userId,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
      }));

    if (recipients.length === 0) {
      throw new BadRequestException('None of the allotted users have an email address');
    }

    const summary = await this.mailService.sendAuditAssignment({
      audit: {
        id: audit.id,
        auditNumber: audit.auditNumber,
        title: audit.title,
        description: audit.description,
        scheduledDate: audit.scheduledDate,
        dueDate: audit.dueDate,
      },
      templateName: audit.template?.name,
      departmentName: audit.department?.name,
      locationName: audit.location?.name,
      auditor: { firstName: auditor.firstName, lastName: auditor.lastName, email: auditor.email },
      recipients,
      message,
    });

    // Remember when the mail went out for each allotted user.
    const sentAt = new Date();
    for (const row of assignees) {
      const outcome = summary.results.find((result) => result.userId === row.userId);
      if (!outcome || outcome.transport === 'none') continue;
      await this.assigneeRepository.update(row.id, { emailSentAt: sentAt });
    }

    return summary;
  }

  /**
   * Start an audit — transitions from Draft to InProgress.
   * Creates answer records for all template questions.
   */
  async startAudit(id: string, auditorId?: string): Promise<Audit> {
    const audit = await this.findOne(id);

    if (audit.status !== AuditStatus.Draft) {
      throw new BadRequestException(`Audit can only be started from Draft status (current: ${audit.status})`);
    }

    audit.status = AuditStatus.InProgress;
    audit.actualStart = new Date();
    if (auditorId) audit.auditorId = auditorId;

    // Create answer records for all questions in the template
    const template = await this.templateRepository.findOne({
      where: { id: audit.templateId },
      relations: ['categories', 'categories.questions'],
    });

    if (template && template.categories) {
      const allQuestions: any[] = [];
      for (const cat of template.categories) {
        if (cat.questions && cat.questions.length) {
          allQuestions.push(...cat.questions);
        }
      }

      const existingAnswers = await this.answerRepository.find({ where: { auditId: audit.id } });
      if (existingAnswers.length === 0 && allQuestions.length > 0) {
        const answerEntities = allQuestions.map((q) =>
          this.answerRepository.create({
            id: generateUUID(),
            auditId: audit.id,
            questionId: q.id,
            answer: null,
            comment: '',
            evidenceIds: [],
            findingId: null,
            answeredAt: null,
            answeredById: null,
          }),
        );
        await this.answerRepository.save(answerEntities);
      }
    }

    const saved = await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'status_changed', 'Audit', saved.id,
      { status: AuditStatus.Draft }, { status: AuditStatus.InProgress },
    );

    return this.findOne(saved.id);
  }

  /**
   * Get the audit checklist — template questions with existing answers.
   */
  async getChecklist(id: string) {
    const audit = await this.findOne(id);

    const questions = await this.questionRepository.find({
      where: { templateId: audit.templateId },
      relations: ['category'],
      order: { sortOrder: 'ASC' },
    });

    const answers = await this.answerRepository.find({
      where: { auditId: audit.id },
      relations: ['question', 'finding'],
    });

    // Group by category
    const categoriesMap: Record<string, any> = {};

    for (const q of questions) {
      const categoryName = q.category ? q.category.name : 'Uncategorized';
      if (!categoriesMap[categoryName]) {
        categoriesMap[categoryName] = {
          id: q.category ? q.category.id : null,
          name: categoryName,
          description: q.category ? q.category.description : '',
          questions: [],
        };
      }

      const answer = answers.find((a) => a.questionId === q.id);
      categoriesMap[categoryName].questions.push({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        isMandatory: q.isMandatory,
        weight: Number(q.weight),
        options: q.options,
        answer: answer ? answer.answer : null,
        comment: answer ? answer.comment : '',
        evidenceIds: answer ? answer.evidenceIds : [],
        findingId: answer ? answer.findingId : null,
      });
    }

    return {
      audit: {
        id: audit.id,
        auditNumber: audit.auditNumber,
        title: audit.title,
        status: audit.status,
        template: { id: audit.templateId, name: audit.template.name },
        department: audit.department,
        location: audit.location,
        score: Number(audit.score),
        maxScore: Number(audit.maxScore),
        compliancePercentage: Number(audit.compliancePercentage),
        totalQuestions: audit.totalQuestions,
        answeredQuestions: audit.answeredQuestions,
      },
            categories: Object.values(categoriesMap),
    };
  }

  /**
   * Save an answer to a checklist question and recalculate scores.
   */
  async saveAnswer(auditId: string, questionId: string, answer: string, comment?: string, evidenceIds?: string[]): Promise<any> {
    const audit = await this.findOne(auditId);

    const existing = await this.answerRepository.findOne({
      where: { auditId, questionId },
    });

    if (existing) {
      existing.answer = answer as AnswerOption;
      existing.comment = comment || '';
      existing.evidenceIds = evidenceIds || [];
      existing.answeredAt = new Date();
      existing.answeredById = '5b094623-a5cf-4cf0-9ccf-e5788478fee4';
      await this.answerRepository.save(existing);
    } else {
      const newAnswer = this.answerRepository.create({
        id: generateUUID(),
        auditId,
        questionId,
        answer: answer as AnswerOption,
        comment: comment || '',
        evidenceIds: evidenceIds || [],
        findingId: null,
        answeredAt: new Date(),
        answeredById: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
      });
      await this.answerRepository.save(newAnswer);
    }

    // Recalculate scores
    await this.calculateScores(auditId);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'AuditAnswer', existing?.id || '',
      null, { answer, comment, questionId },
    );

        return { auditId, questionId, answer, comment };
  }

  /**
   * Recalculate audit scores based on current answers.
   * - Compliant answers contribute their weight to the score.
   * - Non-Compliant and Observation count against compliance.
   * - N/A answers are excluded from the compliance percentage.
   */
  private async calculateScores(auditId: string): Promise<void> {
    const audit = await this.auditRepository.findOne({ where: { id: auditId } });
    if (!audit) return;

    const answers = await this.answerRepository.find({
      where: { auditId },
      relations: ['question'],
    });

    let score = 0;
    let maxScore = 0;
    let answeredCount = 0;
    let nonComplianceCount = 0;

    for (const ans of answers) {
      if (ans.answer === null || ans.answer === undefined) continue;

      const weight = Number(ans.question?.weight || 1);
      maxScore += weight;
      answeredCount++;

      if (ans.answer === AnswerOption.Compliant || (ans.answer as any) === 'compliant') {
        score += weight;
      }
      if (ans.answer === AnswerOption.NonCompliant || (ans.answer as any) === 'non_compliant') {
        nonComplianceCount++;
      }
      if (ans.answer === AnswerOption.Observation || (ans.answer as any) === 'observation') {
        nonComplianceCount++;
      }
    }

    audit.score = score;
    audit.maxScore = maxScore;
    audit.answeredQuestions = answeredCount;
    audit.nonComplianceCount = nonComplianceCount;
    audit.compliancePercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    await this.auditRepository.save(audit);
  }

  /**
   * Submit an audit for manager review.
   */
  async submitAudit(id: string): Promise<Audit> {
    const audit = await this.findOne(id);
    if (audit.status !== AuditStatus.InProgress) {
      throw new BadRequestException('Only in-progress audits can be submitted');
    }

    const oldStatus = audit.status;
    audit.status = AuditStatus.Submitted;
    audit.actualEnd = audit.actualEnd || new Date();
    await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'status_changed', 'Audit', id,
      { status: oldStatus }, { status: AuditStatus.Submitted },
    );

    // Notify department manager
    await this.notificationsService.create({
      userId: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
      type: 'audit_due' as any,
      title: 'Audit Submitted for Review',
      message: `Audit ${audit.auditNumber} "${audit.title}" has been submitted for your review.`,
      relatedId: audit.id,
      relatedType: 'Audit',
    });

    return this.findOne(id);
  }

  /**
   * Approve an audit (manager review).
   */
  async approveAudit(id: string, comments?: string): Promise<Audit> {
    const audit = await this.findOne(id);
    if (audit.status !== AuditStatus.Submitted && audit.status !== AuditStatus.InReview) {
      throw new BadRequestException('Only submitted audits can be approved');
    }

    const oldStatus = audit.status;
    audit.status = AuditStatus.Approved;
    audit.approvedById = '5b094623-a5cf-4cf0-9ccf-e5788478fee4';
    audit.approvedAt = new Date();
    audit.updatedAt = new Date();
    await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'approved', 'Audit', id,
      { status: oldStatus }, { status: AuditStatus.Approved, approvedById: audit.approvedById },
    );

    // Record approval
    // (Approval is tracked in the audit_log and audit record itself)

    return this.findOne(id);
  }

  /**
   * Reject an audit (return to auditor).
   */
  async rejectAudit(id: string, comments?: string): Promise<Audit> {
    const audit = await this.findOne(id);
    if (audit.status !== AuditStatus.Submitted && audit.status !== AuditStatus.InReview) {
      throw new BadRequestException('Only submitted audits can be rejected');
    }

    const oldStatus = audit.status;
    audit.status = AuditStatus.Rejected;
    audit.updatedAt = new Date();
    await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'rejected', 'Audit', id,
      { status: oldStatus }, { status: AuditStatus.Rejected },
    );

    await this.notificationsService.create({
      userId: audit.auditorId,
      type: 'audit_rejected' as any,
      title: 'Audit Rejected',
      message: `Audit ${audit.auditNumber} has been returned for corrections: ${comments || ''}`,
      relatedId: audit.id,
      relatedType: 'Audit',
    });

        return this.findOne(id);
    }

  async addChecklistQuestion(id: string, data: { questionText: string; questionType?: QuestionType; isMandatory?: boolean; weight?: number; categoryId?: string | null; sortOrder?: number }) {
    const audit = await this.findOne(id);
    if (data.questionType && !Object.values(QuestionType).includes(data.questionType)) {
      throw new BadRequestException('Invalid checklist question type');
    }
    if (data.weight !== undefined && data.weight < 0.01) {
      throw new BadRequestException('Question weight must be greater than zero');
    }
    const question = await this.questionRepository.save(this.questionRepository.create({
      id: generateUUID(), templateId: audit.templateId, categoryId: data.categoryId || null,
      questionText: data.questionText.trim(), questionType: data.questionType || QuestionType.YesNo,
      isMandatory: data.isMandatory !== false, weight: data.weight || 1,
      sortOrder: data.sortOrder || await this.questionRepository.count({ where: { templateId: audit.templateId } }) + 1,
      options: [],
    }));
    audit.totalQuestions = await this.questionRepository.count({ where: { templateId: audit.templateId } });
    await this.auditRepository.save(audit);
    return question;
  }

  async updateChecklistQuestion(id: string, questionId: string, data: Partial<TemplateQuestion>) {
    const audit = await this.findOne(id);
    const question = await this.questionRepository.findOne({ where: { id: questionId, templateId: audit.templateId } });
    if (!question) throw new NotFoundException('Checklist question not found');
    if (data.questionText !== undefined) question.questionText = data.questionText.trim();
    if (data.questionType !== undefined) question.questionType = data.questionType as QuestionType;
    if (data.isMandatory !== undefined) question.isMandatory = data.isMandatory;
    if (data.weight !== undefined) question.weight = data.weight;
    return this.questionRepository.save(question);
  }

  async emailChecklist(id: string, message?: string) {
    const audit = await this.findOne(id);
    const assignees = await this.assigneeRepository.find({ where: { auditId: id }, relations: ['user'] });
    if (!assignees.length) throw new BadRequestException('No users are allotted to this audit');
    const auditor = audit.auditor;
    const questions = await this.questionRepository.find({ where: { templateId: audit.templateId }, order: { sortOrder: 'ASC' } });
    const checklist = questions.map((q, index) => `${index + 1}. ${q.questionText}`).join('\n');
    const appUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';
    const text = `${personName(auditor)} has shared the checklist for audit ${audit.auditNumber} — ${audit.title}.\n\n${checklist}\n\n${message || ''}\n\nOpen the audit: ${appUrl}/audits/${audit.id}`;
    return this.mailService.send({ to: assignees.map((row) => row.user.email), subject: `Audit checklist: ${audit.auditNumber} — ${audit.title}`, text, fromName: personName(auditor), fromEmail: auditor.email, replyTo: auditor.email });
  }

  /**
   * Update audit details.
   */
  async update(id: string, dto: Partial<CreateAuditDto>): Promise<Audit> {
    const audit = await this.findOne(id);
    const oldValues = {
      title: audit.title,
      description: audit.description,
      status: audit.status,
      scheduledDate: audit.scheduledDate,
      dueDate: audit.dueDate,
    };

    Object.assign(audit, dto);
    if (dto.scheduledDate) audit.scheduledDate = new Date(dto.scheduledDate);
    if (dto.dueDate) audit.dueDate = new Date(dto.dueDate);
    audit.updatedAt = new Date();

    const saved = await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'Audit', id, oldValues,
      { title: saved.title, description: saved.description, status: saved.status },
    );

    return this.findOne(id);
  }

  /**
   * Delete an audit (only drafts allowed).
   */
  async delete(id: string): Promise<void> {
    const audit = await this.findOne(id);
    if (audit.status !== AuditStatus.Draft) {
      throw new BadRequestException('Only draft audits can be deleted');
    }

    await this.auditRepository.remove(audit);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'deleted', 'Audit', id, { auditNumber: audit.auditNumber }, null,
    );
  }

  /**
   * Get dashboard statistics — used by the frontend dashboard.
   */
  async getStats(): Promise<any> {
    const [
      totalAudits, draftAudits, inProgressAudits, completedAudits,
      openFindingsCount, criticalFindingsCount, overdueFindingsCount,
      openActionsCount, overdueActionsCount,
    ] = await Promise.all([
      this.auditRepository.count({ where: {} }),
      this.auditRepository.count({ where: { status: AuditStatus.Draft } }),
      this.auditRepository.count({ where: { status: AuditStatus.InProgress } }),
      this.auditRepository.count({ where: { status: AuditStatus.Closed } }),
      this.findingRepository.count({ where: { status: 'open' as any } }),
      this.findingRepository.count({ where: { severity: 'critical' as any } }),
      this.findingRepository.count({ where: { status: 'overdue' as any } }),
      this.findingRepository.count({ where: { status: 'in_progress' as any } }),
      this.findingRepository.count({ where: { status: 'overdue' as any } }),
    ]);

    // Calculate compliance percentage
    const allAudits = await this.auditRepository.find({
      where: { status: AuditStatus.Closed },
      select: ['compliancePercentage'],
    });
    const avgCompliance = allAudits.length > 0
      ? allAudits.reduce((sum, a) => sum + Number(a.compliancePercentage), 0) / allAudits.length
      : 0;

    return {
      totalAudits,
      draftAudits,
      inProgressAudits,
      completedAudits,
      openFindings: openFindingsCount,
      criticalFindings: criticalFindingsCount,
      overdueFindings: overdueFindingsCount,
      openCorrectiveActions: openActionsCount,
      overdueCorrectiveActions: overdueActionsCount,
      compliancePercentage: Math.round(avgCompliance * 100) / 100,
    };
  }

  /**
   * Get chart data for the dashboard.
   */
  async getDashboardCharts(): Promise<any> {
    // Audits by department
    const auditsByDept = await this.auditRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.department', 'department')
      .select(['department.name'])
      .addSelect('COUNT(*)', 'count')
      .groupBy('department.name')
      .getRawMany();

    // Findings by severity
    const findingsBySeverity = await this.findingRepository.createQueryBuilder('finding')
      .select(['finding.severity'])
      .addSelect('COUNT(*)', 'count')
      .groupBy('finding.severity')
      .getRawMany();

    // Monthly audit completion
    const monthlyCompletion = await this.auditRepository.createQueryBuilder('audit')
      .select("TO_CHAR(audit.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'total')
      .addSelect("COUNT(CASE WHEN audit.status = 'closed' THEN 1 END)", 'completed')
      .where('audit.createdAt >= :sixMonthsAgo', {
        sixMonthsAgo: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      auditsByDepartment: auditsByDept.map((r) => ({ department: r.department_name, count: Number(r.count) })),
      findingsBySeverity: findingsBySeverity.map((r) => ({ severity: r.finding_severity, count: Number(r.count) })),
      monthlyCompletion: monthlyCompletion.map((r) => ({ month: r.month, total: Number(r.total), completed: Number(r.completed) })),
        };
  }

  /**
   * Close an approved audit (final step).
   */
  async closeAudit(id: string): Promise<Audit> {
    const audit = await this.findOne(id);
    if (audit.status !== AuditStatus.Approved) {
      throw new BadRequestException('Only approved audits can be closed');
    }

    const oldStatus = audit.status;
    audit.status = AuditStatus.Closed;
    audit.updatedAt = new Date();
    await this.auditRepository.save(audit);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'status_changed', 'Audit', id,
      { status: oldStatus }, { status: AuditStatus.Closed },
    );

    return this.findOne(id);
  }
}





