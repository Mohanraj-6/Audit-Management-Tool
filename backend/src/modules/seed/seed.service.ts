/**
 * Seed Service — populates the database with realistic reference data so the
 * application is usable immediately after `docker compose up`.
 *
 * Idempotent: running it twice will not duplicate records. Set
 * AUTO_SEED=false to disable the automatic run at start-up.
 *
 * NOTE: the system currently runs without authentication. Every service in the
 * codebase references the default user id
 * '5b094623-a5cf-4cf0-9ccf-e5788478fee4', so that user must exist — it is
 * created here (mirrors CurrentUserService defaults, configurable via env).
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Role,
  User,
  Department,
  Location,
  AuditTemplate,
  TemplateCategory,
  TemplateQuestion,
  Audit,
  AuditAnswer,
  Finding,
  CorrectiveAction,
  Notification,
  Setting,
} from '../../entities';
import {
  ActionStatus,
  AnswerOption,
  AuditStatus,
  AuditType,
  FindingSeverity,
  FindingStatus,
  NotificationType,
  QuestionType,
  UserRole,
} from '../../shared/enums';
import { generateUUID, getCurrentYear } from '../../shared/utils/helpers';

export interface SeedResult {
  seeded: boolean;
  skipped?: boolean;
  message: string;
  counts?: Record<string, number>;
}

const DEFAULT_USER_ID = '5b094623-a5cf-4cf0-9ccf-e5788478fee4';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Department) private departmentRepository: Repository<Department>,
    @InjectRepository(Location) private locationRepository: Repository<Location>,
    @InjectRepository(AuditTemplate) private templateRepository: Repository<AuditTemplate>,
    @InjectRepository(TemplateCategory) private categoryRepository: Repository<TemplateCategory>,
    @InjectRepository(TemplateQuestion) private questionRepository: Repository<TemplateQuestion>,
    @InjectRepository(Audit) private auditRepository: Repository<Audit>,
    @InjectRepository(AuditAnswer) private answerRepository: Repository<AuditAnswer>,
    @InjectRepository(Finding) private findingRepository: Repository<Finding>,
    @InjectRepository(CorrectiveAction) private actionRepository: Repository<CorrectiveAction>,
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    @InjectRepository(Setting) private settingRepository: Repository<Setting>,
  ) {}

  /** Runs once when the module is initialised (unless AUTO_SEED=false). */
  async onModuleInit(): Promise<void> {
    if (process.env.AUTO_SEED === 'false') {
      this.logger.log('Automatic seeding disabled (AUTO_SEED=false)');
      return;
    }

    try {
      const result = await this.seed();
      this.logger.log(result.message);
    } catch (error) {
      // Never crash the API because of seeding problems.
      this.logger.error(`Seeding failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /** Status endpoint — reports whether the database already holds data. */
  async status(): Promise<{ seeded: boolean; counts: Record<string, number> }> {
    const [roles, users, departments, locations, templates, audits, findings, actions, settings] =
      await Promise.all([
        this.roleRepository.count(),
        this.userRepository.count(),
        this.departmentRepository.count(),
        this.locationRepository.count(),
        this.templateRepository.count(),
        this.auditRepository.count(),
        this.findingRepository.count(),
        this.actionRepository.count(),
        this.settingRepository.count(),
      ]);

    return {
      seeded: roles > 0 && users > 0 && templates > 0,
      counts: { roles, users, departments, locations, templates, audits, findings, actions, settings },
    };
  }

  /**
   * Seeds the database. When `force` is true the existing seed rows are
   * cleared first.
   */
  async seed(force = false): Promise<SeedResult> {
    const current = await this.status();

    if (current.seeded && !force) {
      return {
        seeded: false,
        skipped: true,
        message: 'Database already contains data — skipping seeding',
        counts: current.counts,
      };
    }

    if (force) {
      await this.reset();
    }

    const roles = await this.seedRoles();
    const departments = await this.seedDepartments();
    const locations = await this.seedLocations(departments);
    const users = await this.seedUsers(roles, departments);
    await this.seedSettings();
    const templates = await this.seedTemplates(departments, users);
    await this.seedAudits(templates, departments, locations, users);
    await this.seedNotifications();

    const after = await this.status();
    return { seeded: true, message: 'Database seeded successfully', counts: after.counts };
  }

  /** Removes all seeded rows (used with POST /api/seed?force=true). */
  private async reset(): Promise<void> {
    await this.notificationRepository.query('DELETE FROM notifications');
    await this.actionRepository.query('DELETE FROM corrective_actions');
    await this.findingRepository.query('DELETE FROM findings');
    await this.answerRepository.query('DELETE FROM audit_answers');
    await this.auditRepository.query('DELETE FROM audits');
    await this.questionRepository.query('DELETE FROM template_questions');
    await this.categoryRepository.query('DELETE FROM template_categories');
    await this.templateRepository.query('DELETE FROM audit_templates');
    await this.userRepository.query('DELETE FROM users');
    await this.locationRepository.query('DELETE FROM locations');
    await this.departmentRepository.query('DELETE FROM departments');
    await this.roleRepository.query('DELETE FROM roles');
    await this.settingRepository.query('DELETE FROM settings');
  }

  // ─── Reference data ───────────────────────────────────────────────

  private async seedRoles(): Promise<Record<string, Role>> {
    const definitions: Array<Pick<Role, 'name' | 'description' | 'permissions'>> = [
      {
        name: UserRole.Admin,
        description: 'Full system access — users, templates, settings and all records',
        permissions: ['*'],
      },
      {
        name: UserRole.Auditor,
        description: 'Creates and executes audits, records findings',
        permissions: ['audit:create', 'audit:execute', 'finding:create', 'finding:edit', 'action:verify'],
      },
      {
        name: UserRole.DepartmentManager,
        description: 'Reviews and approves audits for the department',
        permissions: ['audit:view', 'audit:approve', 'action:verify', 'report:view'],
      },
      {
        name: UserRole.ActionOwner,
        description: 'Implements and submits corrective actions',
        permissions: ['action:view', 'action:update', 'action:submit'],
      },
      {
        name: UserRole.Management,
        description: 'Read-only access to dashboards and reports',
        permissions: ['audit:view', 'finding:view', 'report:view'],
      },
    ];

    const result: Record<string, Role> = {};
    for (const def of definitions) {
      let role = await this.roleRepository.findOne({ where: { name: def.name } });
      if (!role) {
        role = await this.roleRepository.save(
          this.roleRepository.create({
            id: generateUUID(),
            name: def.name,
            description: def.description,
            permissions: def.permissions,
            isActive: true,
          }),
        );
      }
      result[def.name] = role;
    }
    return result;
  }

  private async seedDepartments(): Promise<Record<string, Department>> {
    const definitions = [
      { name: 'Logistics', code: 'LOG', description: 'Inbound and outbound freight, customs clearance and dispatch' },
      { name: 'Purchase', code: 'PUR', description: 'Vendor development, procurement and material planning' },
      { name: 'Equipment Engineering', code: 'EQE', description: 'Equipment selection, installation, calibration and upkeep' },
      { name: 'Wisteria-PCB', code: 'WPCB', description: 'PCB fabrication, assembly and process control' },
      { name: 'Sales & Marketing', code: 'SM', description: 'Customer orders, business development and marketing' },
    ];

    const result: Record<string, Department> = {};
    for (const def of definitions) {
      let dept = await this.departmentRepository.findOne({ where: { code: def.code } });
      if (!dept) {
        dept = await this.departmentRepository.save(
          this.departmentRepository.create({
            id: generateUUID(),
            name: def.name,
            code: def.code,
            description: def.description,
          }),
        );
      }
      result[def.code] = dept;
    }
    return result;
  }

  private async seedLocations(
    departments: Record<string, Department>,
  ): Promise<Record<string, Location>> {
    const definitions = [
      { name: 'Plant A — Main Building', code: 'PLANT-A', address: 'Plot 12, Industrial Estate, Pune 411019', dept: 'WPCB' },
      { name: 'Plant B — Assembly Line', code: 'PLANT-B', address: 'Plot 13, Industrial Estate, Pune 411019', dept: 'WPCB' },
      { name: 'Warehouse 1', code: 'WH-01', address: 'Gate 4, Logistics Park, Pune 411026', dept: 'LOG' },
      { name: 'Central Quality Lab', code: 'LAB-01', address: 'Main Building, 2nd Floor, Pune 411019', dept: 'EQE' },
      { name: 'Administration Block', code: 'ADMIN', address: 'Plot 10, Industrial Estate, Pune 411019', dept: 'PUR' },
      { name: 'Corporate Office — Sales & Marketing', code: 'SM-01', address: 'Plot 10, Industrial Estate, Pune 411019', dept: 'SM' },
    ];

    const result: Record<string, Location> = {};
    for (const def of definitions) {
      let location = await this.locationRepository.findOne({ where: { code: def.code } });
      if (!location) {
        location = await this.locationRepository.save(
          this.locationRepository.create({
            id: generateUUID(),
            name: def.name,
            code: def.code,
            address: def.address,
            departmentId: departments[def.dept]?.id,
            isActive: true,
          }),
        );
      }
      result[def.code] = location;
    }
    return result;
  }

  /**
   * Creates the three ChipTest team members. Mohanraj is the system default
   * user — he keeps the fixed id used throughout the services.
   */
  private async seedUsers(
    roles: Record<string, Role>,
    departments: Record<string, Department>,
  ): Promise<Record<string, User>> {
    const definitions: Array<{
      key: string;
      id?: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: UserRole;
      dept?: string;
    }> = [
      {
        key: 'mohanraj',
        id: DEFAULT_USER_ID, // system default user — this id must be kept
        email: process.env.DEFAULT_USER_EMAIL || 'vmmohanraj@chiptest.in',
        firstName: 'Mohanraj',
        lastName: '',
        phone: '+91 98200 00001',
        role: UserRole.Admin,
        dept: 'SM',
      },
      { key: 'anwar', email: 'mnmdanwar@chiptest.in', firstName: 'Anwar', lastName: '', phone: '+91 98200 00002', role: UserRole.Auditor, dept: 'EQE' },
      { key: 'shanmuganathan', email: 'ashanmuganathan@chiptest.in', firstName: 'Shanmuganathan', lastName: '', phone: '+91 98200 00003', role: UserRole.DepartmentManager, dept: 'WPCB' },
    ];

    const result: Record<string, User> = {};
    for (const def of definitions) {
      let user = def.id
        ? await this.userRepository.findOne({ where: { id: def.id } })
        : await this.userRepository.findOne({ where: { email: def.email } });

      if (!user) {
        user = await this.userRepository.save(
          this.userRepository.create({
            id: def.id || generateUUID(),
            email: def.email,
            passwordHash: 'ChangeMe@123',
            firstName: def.firstName,
            lastName: def.lastName,
            phone: def.phone,
            roleId: roles[def.role].id,
            departmentId: def.dept ? departments[def.dept]?.id : undefined,
            isActive: true,
          }),
        );
      }
      result[def.key] = user;
    }

    // Set department managers now that the users exist.
    const managerOf: Array<[string, string]> = [
      ['WPCB', 'shanmuganathan'],
      ['LOG', 'shanmuganathan'],
      ['EQE', 'anwar'],
      ['PUR', 'mohanraj'],
      ['SM', 'mohanraj'],
    ];
    for (const [deptCode, userKey] of managerOf) {
      const dept = departments[deptCode];
      if (dept && !dept.managerId) {
        dept.managerId = result[userKey].id;
        await this.departmentRepository.save(dept);
      }
    }

    return result;
  }

  private async seedSettings(): Promise<void> {
    const definitions: Array<Pick<Setting, 'key' | 'value' | 'type' | 'description' | 'isPublic'>> = [
      { key: 'company_name', value: 'ChipTest Engineering Pvt. Ltd.', type: 'string', description: 'Company name shown in the header and reports', isPublic: true },
      { key: 'company_logo', value: '', type: 'string', description: 'URL of the company logo', isPublic: true },
      { key: 'company_address', value: 'Plot 12, Industrial Estate, Pune 411019, India', type: 'string', description: 'Registered address used on reports', isPublic: true },
      { key: 'audit_number_prefix', value: 'AUD', type: 'string', description: 'Prefix for audit numbers', isPublic: false },
      { key: 'finding_number_prefix', value: 'FND', type: 'string', description: 'Prefix for finding numbers', isPublic: false },
      { key: 'action_number_prefix', value: 'CA', type: 'string', description: 'Prefix for corrective action numbers', isPublic: false },
      { key: 'template_number_prefix', value: 'TMPL', type: 'string', description: 'Prefix for template numbers', isPublic: false },
      { key: 'default_audit_due_days', value: 14, type: 'number', description: 'Default number of days allowed to complete an audit', isPublic: false },
      { key: 'audit_reminder_days', value: 3, type: 'number', description: 'Days before the due date to send a reminder', isPublic: false },
      { key: 'notifications_enabled', value: true, type: 'boolean', description: 'Enable in-app notifications', isPublic: false },
      { key: 'auto_close_finding_on_verification', value: true, type: 'boolean', description: 'Close the finding when its corrective action is verified', isPublic: false },
      { key: 'passing_compliance_percentage', value: 80, type: 'number', description: 'Minimum compliance percentage considered acceptable', isPublic: false },
    ];

    for (const def of definitions) {
      const existing = await this.settingRepository.findOne({ where: { key: def.key } });
      if (!existing) {
        await this.settingRepository.save(
          this.settingRepository.create({ ...def, isPublic: def.isPublic ?? false }),
        );
      }
    }
  }

  /**
   * Creates three templates (safety, quality, warehouse) with categories and
   * checklist questions, and returns them keyed for the audit seeding step.
   */
  private async seedTemplates(
    departments: Record<string, Department>,
    users: Record<string, User>,
  ): Promise<Record<string, { template: AuditTemplate; questions: TemplateQuestion[] }>> {
    const year = getCurrentYear();
    const definitions: Array<{
      key: string;
      name: string;
      auditType: AuditType;
      dept: string;
      description: string;
      categories: Array<{ name: string; description: string; questions: string[] }>;
    }> = [
      {
        key: 'safety',
        name: 'Annual Workplace Safety Audit',
        auditType: AuditType.Safety,
        dept: 'WPCB',
        description:
          'Covers emergency preparedness, personal protective equipment and workplace housekeeping as required by the annual safety plan.',
        categories: [
          {
            name: 'Emergency Preparedness',
            description: 'Fire safety, evacuation routes and emergency equipment',
            questions: [
              'Are fire extinguishers inspected and tagged within the last 30 days?',
              'Are emergency exits free of obstruction and clearly signposted?',
              'Has an evacuation drill been conducted in the current year?',
            ],
          },
          {
            name: 'Personal Protective Equipment',
            description: 'Availability, usage and condition of PPE',
            questions: [
              'Is appropriate PPE available at all times for the task being performed?',
              'Are employees trained on the correct use of their PPE?',
              'Is damaged or expired PPE removed from service immediately?',
            ],
          },
          {
            name: 'Housekeeping & Storage',
            description: 'General housekeeping and safe storage practices',
            questions: [
              'Are walkways and workstations kept clean and free of clutter?',
              'Are hazardous materials stored in labelled, compatible containers?',
            ],
          },
        ],
      },
      {
        key: 'quality',
        name: 'ISO 9001 Internal Quality Audit',
        auditType: AuditType.Quality,
        dept: 'EQE',
        description:
          'Internal quality management system audit covering document control, process control and measurement traceability.',
        categories: [
          {
            name: 'Document Control',
            description: 'Availability and revision control of QMS documents',
            questions: [
              'Are current revisions of QMS documents available at the point of use?',
              'Are obsolete documents removed or clearly marked as superseded?',
              'Are document changes reviewed and approved before release?',
            ],
          },
          {
            name: 'Process Control',
            description: 'Control of production and service processes',
            questions: [
              'Are process parameters monitored and recorded as defined in the control plan?',
              'Are operators qualified and trained for the processes they operate?',
              'Are non-conforming products segregated and dispositioned per procedure?',
            ],
          },
          {
            name: 'Measurement & Traceability',
            description: 'Calibration and product traceability',
            questions: [
              'Are measuring instruments calibrated and within their due date?',
              'Is product traceability maintained from raw material to dispatch?',
            ],
          },
        ],
      },
      {
        key: 'warehouse',
        name: 'Warehouse Operations Audit',
        auditType: AuditType.Operational,
        dept: 'LOG',
        description:
          'Operational audit of warehouse inventory accuracy, material handling and storage practices.',
        categories: [
          {
            name: 'Inventory Management',
            description: 'Accuracy of stock records and cycle counting',
            questions: [
              'Does the physical stock match the system records for the sampled bins?',
              'Are cycle counts performed as per the schedule and variances investigated?',
              'Are slow-moving and expired items identified and dispositioned?',
            ],
          },
          {
            name: 'Material Handling',
            description: 'Safe handling and movement of materials',
            questions: [
              'Are forklift and stacker operators certified and trained?',
              'Is material stacked within safe height and load limits?',
            ],
          },
        ],
      },
    ];

    const result: Record<string, { template: AuditTemplate; questions: TemplateQuestion[] }> = {};
    let sequence = (await this.templateRepository.count()) + 1;

    for (const def of definitions) {
      let template = await this.templateRepository.findOne({ where: { name: def.name } });

      if (!template) {
        template = await this.templateRepository.save(
          this.templateRepository.create({
            id: generateUUID(),
            templateNumber: `TMPL-${year}-${String(sequence++).padStart(4, '0')}`,
            name: def.name,
            auditType: def.auditType,
            departmentId: departments[def.dept]?.id,
            versionNumber: 1,
            effectiveDate: `${year}-01-01`,
            description: def.description,
            isActive: true,
            createdById: users.mohanraj.id,
          }),
        );
      }

      const questions: TemplateQuestion[] = [];
      let categoryOrder = 0;
      let questionOrder = 0;

      for (const catDef of def.categories) {
        let category = await this.categoryRepository.findOne({
          where: { templateId: template.id, name: catDef.name },
        });
        if (!category) {
          category = await this.categoryRepository.save(
            this.categoryRepository.create({
              id: generateUUID(),
              templateId: template.id,
              name: catDef.name,
              description: catDef.description,
              sortOrder: categoryOrder++,
            }),
          );
        }

        for (const text of catDef.questions) {
          let question = await this.questionRepository.findOne({
            where: { templateId: template.id, questionText: text },
          });
          if (!question) {
            question = await this.questionRepository.save(
              this.questionRepository.create({
                id: generateUUID(),
                templateId: template.id,
                categoryId: category.id,
                questionText: text,
                questionType: QuestionType.YesNo,
                isMandatory: true,
                weight: 1,
                sortOrder: questionOrder++,
                options: [],
              }),
            );
          }
          questions.push(question);
        }
      }

      result[def.key] = { template, questions };
    }

    return result;
  }

  /**
   * Creates a spread of audits across the whole lifecycle (draft, in progress,
   * submitted, approved, closed) together with answers, findings and
   * corrective actions so every screen has meaningful data.
   */
  private async seedAudits(
    templates: Record<string, { template: AuditTemplate; questions: TemplateQuestion[] }>,
    departments: Record<string, Department>,
    locations: Record<string, Location>,
    users: Record<string, User>,
  ): Promise<void> {
    const year = getCurrentYear();
    const day = 24 * 60 * 60 * 1000;
    const at = (offset: number) => new Date(Date.now() + offset * day);

    interface SeedFinding {
      questionIndex: number;
      description: string;
      severity: FindingSeverity;
      dept: string;
      assignedToKey: string;
      dueOffset: number;
      corrective?: {
        status: ActionStatus;
        rootCause: string;
        action: string;
        preventive: string;
        completionOffset?: number;
        verificationComments?: string;
      };
    }

    const plan: Array<{
      seq: number;
      templateKey: 'safety' | 'quality' | 'warehouse';
      title: string;
      description: string;
      dept: string;
      locationCode: string;
      status: AuditStatus;
      auditorKey: string;
      scheduledOffset: number;
      dueOffset: number;
      actualStartOffset?: number;
      actualEndOffset?: number;
      approvedOffset?: number;
      closedOffset?: number;
      answers: Array<AnswerOption | null>;
      findings?: SeedFinding[];
    }> = [
      {
        seq: 1,
        templateKey: 'safety',
        title: 'Workplace Safety Audit — Administration Block',
        description: 'Scheduled annual safety audit of the administration block and common areas.',
        dept: 'PUR',
        locationCode: 'ADMIN',
        status: AuditStatus.Draft,
        auditorKey: 'anwar',
        scheduledOffset: 5,
        dueOffset: 19,
        answers: [null, null, null, null, null, null, null, null],
      },
      {
        seq: 2,
        templateKey: 'safety',
        title: 'Workplace Safety Audit — Plant A',
        description: 'Annual safety audit of Plant A shop floor, storage areas and emergency equipment.',
        dept: 'WPCB',
        locationCode: 'PLANT-A',
        status: AuditStatus.InProgress,
        auditorKey: 'anwar',
        scheduledOffset: -3,
        dueOffset: 11,
        actualStartOffset: -3,
        answers: [
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.NonCompliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Observation,
          AnswerOption.Compliant,
          null,
        ],
      },
      {
        seq: 3,
        templateKey: 'quality',
        title: 'ISO 9001 Internal Quality Audit — Q1',
        description: 'Quarterly internal quality audit of the quality management system.',
        dept: 'EQE',
        locationCode: 'LAB-01',
        status: AuditStatus.Submitted,
        auditorKey: 'anwar',
        scheduledOffset: -12,
        dueOffset: 2,
        actualStartOffset: -12,
        actualEndOffset: -1,
        answers: [
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.NonCompliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.NonCompliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
        ],
        findings: [
          {
            questionIndex: 5,
            description:
              'Non-conforming material from batch BX-2291 was found stored with conforming stock instead of being segregated in the quarantine area.',
            severity: FindingSeverity.Major,
            dept: 'WPCB',
            assignedToKey: 'shanmuganathan',
            dueOffset: 12,
            corrective: {
              status: ActionStatus.InProgress,
              rootCause:
                'Quarantine area was not clearly demarcated and operators were not re-trained after the layout change.',
              action:
                'Demarcate and label the quarantine area, re-train all shift operators and add a verification step to the shift checklist.',
              preventive:
                'Add quarterly 5S audits of the quarantine area and include non-conformance segregation in annual refresher training.',
            },
          },
          {
            questionIndex: 2,
            description:
              'Two obsolete work instructions were still available at the assembly station in addition to the current revision.',
            severity: FindingSeverity.Minor,
            dept: 'EQE',
            assignedToKey: 'anwar',
            dueOffset: 7,
            corrective: {
              status: ActionStatus.Verification,
              rootCause: 'Document recall was not performed when the new revision was released.',
              action:
                'Withdraw obsolete copies, update the master document list and institute a controlled recall checklist.',
              preventive: 'Monthly document control walkthrough as part of the QA routine.',
              completionOffset: -1,
            },
          },
        ],
      },
      {
        seq: 4,
        templateKey: 'warehouse',
        title: 'Warehouse Operations Audit — Warehouse 1',
        description: 'Operational audit of inventory accuracy and material handling at Warehouse 1.',
        dept: 'LOG',
        locationCode: 'WH-01',
        status: AuditStatus.Approved,
        auditorKey: 'anwar',
        scheduledOffset: -20,
        dueOffset: -6,
        actualStartOffset: -20,
        actualEndOffset: -8,
        approvedOffset: -4,
        answers: [
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.NonCompliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
        ],
        findings: [
          {
            questionIndex: 2,
            description:
              'Eleven bins were found holding expired raw material lots that were not identified for disposition.',
            severity: FindingSeverity.Critical,
            dept: 'LOG',
            assignedToKey: 'shanmuganathan',
            dueOffset: -1,
            corrective: {
              status: ActionStatus.Verification,
              rootCause: 'No periodic shelf-life review of raw material lots is defined for slow moving items.',
              action:
                'Introduce a monthly shelf-life review, quarantine all expired lots and dispose of them through the approved scrap process.',
              preventive: 'Add an automated expiry alert in the inventory system with a 60-day lead time.',
              completionOffset: -1,
            },
          },
        ],
      },
      {
        seq: 5,
        templateKey: 'safety',
        title: 'Workplace Safety Audit — Central Quality Lab',
        description: 'Annual safety audit of the central quality laboratory — closed with full compliance.',
        dept: 'EQE',
        locationCode: 'LAB-01',
        status: AuditStatus.Closed,
        auditorKey: 'anwar',
        scheduledOffset: -40,
        dueOffset: -26,
        actualStartOffset: -40,
        actualEndOffset: -28,
        approvedOffset: -25,
        closedOffset: -22,
        answers: [
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
          AnswerOption.Compliant,
        ],
      },
    ];

    let findingSequence = (await this.findingRepository.count()) + 1;
    let actionSequence = (await this.actionRepository.count()) + 1;

    for (const item of plan) {
      const auditNumber = `AUD-${year}-${String(item.seq).padStart(4, '0')}`;
      const existing = await this.auditRepository.findOne({ where: { auditNumber } });
      if (existing) continue;

      const { template, questions } = templates[item.templateKey];
      const stats = computeCompliance(questions, item.answers);

      const audit = await this.auditRepository.save(
        this.auditRepository.create({
          id: generateUUID(),
          auditNumber,
          templateId: template.id,
          title: item.title,
          description: item.description,
          auditType: template.auditType,
          departmentId: departments[item.dept]?.id,
          locationId: locations[item.locationCode]?.id,
          status: item.status,
          auditorId: users[item.auditorKey].id,
          scheduledDate: at(item.scheduledOffset),
          dueDate: at(item.dueOffset),
          actualStart: item.actualStartOffset !== undefined ? at(item.actualStartOffset) : undefined,
          actualEnd: item.actualEndOffset !== undefined ? at(item.actualEndOffset) : undefined,
          score: stats.score,
          maxScore: stats.maxScore,
          compliancePercentage: stats.compliance,
          totalQuestions: questions.length,
          answeredQuestions: stats.answered,
          nonComplianceCount: stats.nonCompliance,
          approvedById: item.approvedOffset !== undefined ? users.mohanraj.id : undefined,
          approvedAt: item.approvedOffset !== undefined ? at(item.approvedOffset) : undefined,
          createdById: users.mohanraj.id,
          createdAt: at(item.scheduledOffset - 4),
        }),
      );

      // ─── Answers ──────────────────────────────────────────────
      const answerEntities: AuditAnswer[] = [];
      for (let i = 0; i < questions.length; i++) {
        const answer = item.answers[i] ?? null;
        if (answer === null) continue; // unanswered questions have no row yet
        answerEntities.push(
          this.answerRepository.create({
            id: generateUUID(),
            auditId: audit.id,
            questionId: questions[i].id,
            answer,
            comment: commentFor(answer),
            evidenceIds: [],
            answeredAt: at((item.actualStartOffset ?? -1) + 1),
            answeredById: users[item.auditorKey].id,
          }),
        );
      }
      if (answerEntities.length) await this.answerRepository.save(answerEntities);

      // ─── Findings & corrective actions ────────────────────────
      for (const f of item.findings ?? []) {
        const question = questions[f.questionIndex];
        const findingNumber = `FND-${year}-${String(findingSequence++).padStart(4, '0')}`;
        const findingStatus = f.corrective
          ? f.corrective.status === ActionStatus.Verification
            ? FindingStatus.PendingVerification
            : FindingStatus.ActionAssigned
          : FindingStatus.Open;

        const finding = await this.findingRepository.save(
          this.findingRepository.create({
            id: generateUUID(),
            findingNumber,
            auditId: audit.id,
            questionId: question?.id,
            category: template.name,
            description: f.description,
            evidence: [],
            severity: f.severity,
            responsibleDepartmentId: departments[f.dept]?.id,
            responsiblePersonId: users[f.assignedToKey].id,
            dueDate: at(f.dueOffset),
            status: findingStatus,
            createdById: users[item.auditorKey].id,
          }),
        );

        if (f.corrective) {
          await this.actionRepository.save(
            this.actionRepository.create({
              id: generateUUID(),
              actionNumber: `CA-${year}-${String(actionSequence++).padStart(4, '0')}`,
              findingId: finding.id,
              rootCause: f.corrective.rootCause,
              correctiveAction: f.corrective.action,
              preventiveAction: f.corrective.preventive,
              assignedToId: users[f.assignedToKey].id,
              dueDate: at(f.dueOffset),
              completionDate:
                f.corrective.completionOffset !== undefined ? at(f.corrective.completionOffset) : undefined,
              evidence: [],
              status: f.corrective.status,
              verificationComments: f.corrective.verificationComments,
              createdById: users.mohanraj.id,
              verifiedById: f.corrective.verificationComments ? users.mohanraj.id : undefined,
              closedAt: f.corrective.status === ActionStatus.Closed ? at(0) : undefined,
            }),
          );
        }
      }
    }
  }

  /** A handful of notifications for the default (signed-in) user. */
  private async seedNotifications(): Promise<void> {
    const existing = await this.notificationRepository.count();
    if (existing > 0) return;

    const year = getCurrentYear();
    const definitions: Array<Omit<Notification, 'id' | 'isRead' | 'createdAt' | 'user'>> = [
      {
        userId: DEFAULT_USER_ID,
        type: NotificationType.AuditAssigned,
        title: 'Audit assigned to you',
        message: `Audit ${year} workplace safety audit has been assigned for completion.`,
        relatedId: null,
        relatedType: 'Audit',
        metadata: { seeded: true },
      },
      {
        userId: DEFAULT_USER_ID,
        type: NotificationType.FindingCreated,
        title: 'Major finding recorded',
        message: 'A major non-conformity was raised for non-conforming material segregation.',
        relatedId: null,
        relatedType: 'Finding',
        metadata: { seeded: true },
      },
      {
        userId: DEFAULT_USER_ID,
        type: NotificationType.ActionDueSoon,
        title: 'Corrective action due soon',
        message: 'A corrective action linked to an expired stock finding is due within 3 days.',
        relatedId: null,
        relatedType: 'CorrectiveAction',
        metadata: { seeded: true },
      },
      {
        userId: DEFAULT_USER_ID,
        type: NotificationType.ActionSubmittedForVerification,
        title: 'Action submitted for verification',
        message: 'A corrective action has been submitted and is awaiting your verification.',
        relatedId: null,
        relatedType: 'CorrectiveAction',
        metadata: { seeded: true },
      },
      {
        userId: DEFAULT_USER_ID,
        type: NotificationType.AuditApproved,
        title: 'Audit approved',
        message: 'The warehouse operations audit has been approved and is ready for closing.',
        relatedId: null,
        relatedType: 'Audit',
        metadata: { seeded: true, read: true },
      },
    ];

    for (const [index, def] of definitions.entries()) {
      await this.notificationRepository.save(
        this.notificationRepository.create({
          id: generateUUID(),
          ...def,
          isRead: index === definitions.length - 1,
        }),
      );
    }
  }
}

/**
 * Mirrors AuditsService.calculateScores(): compliant answers earn their
 * weight, observation/non-compliance are counted against compliance and
 * unanswered questions are excluded from the percentage.
 */
function computeCompliance(
  questions: TemplateQuestion[],
  answers: Array<AnswerOption | null>,
): { score: number; maxScore: number; answered: number; nonCompliance: number; compliance: number } {
  let score = 0;
  let maxScore = 0;
  let answered = 0;
  let nonCompliance = 0;

  questions.forEach((question, index) => {
    const answer = answers[index] ?? null;
    if (answer === null) return;

    const weight = Number(question.weight || 1);
    maxScore += weight;
    answered += 1;

    if (answer === AnswerOption.Compliant) score += weight;
    if (answer === AnswerOption.NonCompliant || answer === AnswerOption.Observation) nonCompliance += 1;
  });

  return {
    score,
    maxScore,
    answered,
    nonCompliance,
    compliance: maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0,
  };
}

/** Realistic comments so the seeded checklists read like real audits. */
function commentFor(answer: AnswerOption): string {
  switch (answer) {
    case AnswerOption.Compliant:
      return 'Verified on site — evidence reviewed and found satisfactory.';
    case AnswerOption.NonCompliant:
      return 'Requirement not met. Finding raised and corrective action required.';
    case AnswerOption.Observation:
      return 'No immediate risk, but improvement opportunity identified.';
    case AnswerOption.NotApplicable:
      return 'Not applicable to this area of operation.';
    default:
      return '';
  }
}
