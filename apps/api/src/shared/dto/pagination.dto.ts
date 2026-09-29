/**
 * Common response wrappers and pagination utilities
 */

import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseWrapper<T> {
  data: T | T[];
  meta?: Record<string, unknown>;
  success: boolean;
  message?: string;
}

export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginationQueryDto {
  @ApiProperty({ required: false, minimum: 1, default: 1 })
  page?: number = 1;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 10 })
  limit?: number = 10;

  @ApiProperty({ required: false })
  search?: string;

  @ApiProperty({ required: false, example: 'createdAt' })
  sortBy?: string;

  @ApiProperty({ required: false, example: 'DESC' })
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Builds a paginated response from raw data and total count
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
