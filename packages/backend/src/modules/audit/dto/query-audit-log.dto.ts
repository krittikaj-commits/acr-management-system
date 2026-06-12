import { z } from 'zod';

/**
 * Zod schema for audit log query parameters.
 */
export const QueryAuditLogSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

export type QueryAuditLogDto = z.infer<typeof QueryAuditLogSchema>;

/**
 * Paginated response format for audit logs.
 */
export interface PaginatedAuditLogResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
