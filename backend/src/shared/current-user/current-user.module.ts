/**
 * CurrentUser module — provides the "current user" concept.
 *
 * Since authentication is not required for local development, this module
 * provides a configurable default user. In production, this would be replaced
 * by a JWT-based auth guard that extracts the user from the token.
 */

import { Injectable, Module, Scope, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The shape of the current user context.
 * This mirrors the User entity but without sensitive fields.
 */
export interface CurrentUserInterface {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId?: string;
  isActive: boolean;
}

/**
 * Injectable service that resolves the "current user".
 * In local mode, it returns a default admin user (configurable via env).
 */
@Injectable({ scope: Scope.REQUEST })
export class CurrentUserService {
  constructor(private configService: ConfigService) {}

  getCurrentUser(): CurrentUserInterface {
    // Configurable default user for local development
    return {
      id: this.configService.get<string>('DEFAULT_USER_ID') || '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
      email: this.configService.get<string>('DEFAULT_USER_EMAIL') || 'vmmohanraj@chiptest.in',
      firstName: this.configService.get<string>('DEFAULT_USER_FIRST_NAME') || 'Mohanraj',
      lastName: this.configService.get<string>('DEFAULT_USER_LAST_NAME') || '',
      role: this.configService.get<string>('DEFAULT_USER_ROLE') || 'admin',
      departmentId: this.configService.get<string>('DEFAULT_USER_DEPARTMENT_ID'),
      isActive: true,
    };
  }
}

@Module({
  providers: [CurrentUserService],
  exports: [CurrentUserService],
})
export class CurrentUserModule {}
