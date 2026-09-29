/**
 * Seed Controller — lets you (re)seed the demo data on demand.
 *
 *   GET  /api/seed/status          → current row counts
 *   POST /api/seed                 → seed if the database is empty
 *   POST /api/seed?force=true      → wipe the seeded tables and reseed
 */

import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check whether the database has been seeded' })
  async status() {
    return this.seedService.status();
  }

  @Post()
  @ApiOperation({ summary: 'Seed the database (idempotent unless force=true)' })
  @ApiQuery({ name: 'force', required: false, description: 'Clear existing seeded data first' })
  async seed(@Query('force') force?: string) {
    return this.seedService.seed(force === 'true');
  }
}
