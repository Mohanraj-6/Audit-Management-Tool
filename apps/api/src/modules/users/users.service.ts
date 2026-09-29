/**
 * Users Service — handles user CRUD operations and user lookup.
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Department } from '../../entities/department.entity';
import { UserRole } from '../../shared/enums';
import { CurrentUserService } from '../../shared/current-user/current-user.module';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { generateUUID } from '../../shared/utils/helpers';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private currentUser: CurrentUserService,
    private AuditLogsService: AuditLogsService,
  ) {}

  /**
   * Get all users with optional filtering by role, department, and active status.
   */
  async findAll(options?: {
    role?: UserRole;
    departmentId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<User[]> {
    const where: any = {};

    if (options?.role) {
      where.role = { name: options.role };
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.departmentId) {
      where.department = { id: options.departmentId };
    }

    const users = await this.userRepository.find({
      where,
      relations: ['role', 'department'],
      order: { createdAt: 'DESC' },
    });

    if (options?.search) {
      const search = options.search.toLowerCase();
      return users.filter(
        (u) =>
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }

    return users;
  }

  /**
   * Get a single user by ID.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'department'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Create a new user.
   */
  async create(userData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
    departmentId?: string;
    password?: string;
  }): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: userData.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const role = await this.roleRepository.findOne({ where: { id: userData.roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${userData.roleId} not found`);
    }

    const user = this.userRepository.create({
      id: generateUUID(),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      passwordHash: userData.password || '',
      roleId: userData.roleId,
      departmentId: userData.departmentId,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);

    const cu = this.currentUser.getCurrentUser();
    await this.AuditLogsService.logAction(
      cu.id, 'created', 'User', saved.id, null,
      { id: saved.id, email: saved.email, firstName: saved.firstName, lastName: saved.lastName },
    );

    return (await this.userRepository.findOne({
      where: { id: saved.id },
      relations: ['role', 'department'],
    })) as User;
  }

  /**
   * Update an existing user.
   */
  async update(id: string, userData: Partial<{
    email: string; firstName: string; lastName: string;
    phone: string; roleId: string; departmentId: string; isActive: boolean;
  }>): Promise<User> {
    const user = await this.findOne(id);
    const oldValues = { email: user.email, firstName: user.firstName, lastName: user.lastName, isActive: user.isActive };

    if (userData.email) user.email = userData.email;
    if (userData.firstName) user.firstName = userData.firstName;
    if (userData.lastName) user.lastName = userData.lastName;
    if (userData.phone !== undefined) user.phone = userData.phone;
    if (userData.isActive !== undefined) user.isActive = userData.isActive;

    if (userData.roleId) {
      const role = await this.roleRepository.findOne({ where: { id: userData.roleId } });
      if (!role) throw new NotFoundException(`Role with ID ${userData.roleId} not found`);
      user.role = role;
    }

    if (userData.departmentId) {
      const dept = await this.departmentRepository.findOne({ where: { id: userData.departmentId } });
      if (!dept) throw new NotFoundException(`Department with ID ${userData.departmentId} not found`);
      user.department = dept;
    }

    const saved = await this.userRepository.save(user);
    const cu = this.currentUser.getCurrentUser();
    await this.AuditLogsService.logAction(
      cu.id, 'updated', 'User', saved.id, oldValues,
      { email: saved.email, firstName: saved.firstName, lastName: saved.lastName, isActive: saved.isActive },
    );

    return (await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'department'],
    })) as User;
  }

  /**
   * Deactivate a user (soft delete).
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isActive = false;
    user.deletedAt = new Date();
    await this.userRepository.save(user);

    const cu = this.currentUser.getCurrentUser();
    await this.AuditLogsService.logAction(cu.id, 'deleted', 'User', id, { isActive: true }, { isActive: false });
  }

  /**
   * Get users by role.
   */
  async findByRole(role: UserRole): Promise<User[]> {
    const roleEntity = await this.roleRepository.findOne({ where: { name: role } });
    if (!roleEntity) return [];
    return this.userRepository.find({
      where: { role: { id: roleEntity.id }, isActive: true },
      relations: ['role', 'department'],
      order: { firstName: 'ASC' },
    });
  }

  /**
   * Get available roles.
   */
  async getRoles(): Promise<Role[]> {
    return this.roleRepository.find({ where: { isActive: true } });
  }
}
