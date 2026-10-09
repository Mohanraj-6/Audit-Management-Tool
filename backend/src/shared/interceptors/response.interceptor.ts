/**
 * Response interceptor — wraps all controller responses in a consistent format.
 *
 * Output format:
 * {
 *   success: true,
 *   data: ...,
 *   meta: { ... }  // optional
 * }
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
  message?: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: any) => {
        // If the response is already in our format, pass it through
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
