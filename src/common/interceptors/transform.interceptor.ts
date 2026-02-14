import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                // If data already has success property, return as is
                if (data && typeof data === 'object' && 'success' in data) {
                    return data;
                }

                // Handle paginated responses
                if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
                    return {
                        success: true,
                        message: 'Success',
                        data: data.items,
                        meta: data.meta,
                    };
                }

                return {
                    success: true,
                    message: 'Success',
                    data,
                };
            }),
        );
    }
}
