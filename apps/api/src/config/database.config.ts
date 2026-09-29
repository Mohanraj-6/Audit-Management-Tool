/**
 * Database configuration namespace for @nestjs/config
 */
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://ams_user:ams_pass@localhost:5432/audit_mgmt',
}));