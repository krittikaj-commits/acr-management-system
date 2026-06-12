import { z } from 'zod';

/**
 * CRSearchQuery — Query parameters for searching and filtering change requests.
 *
 * Supports:
 * - Full-text search across crNumber, description, requesterName, service
 * - Filtering by changeType, impactLevel, assignedToId, requesterEmail, date range
 * - Pagination (page, pageSize) with configurable sorting
 */
export const CRSearchQuerySchema = z.object({
  /** Full-text search across crNumber, description, requesterName, affectedService */
  search: z.string().optional(),
  /** Filter by change type: 'normal' | 'emergency' */
  changeType: z.enum(['normal', 'emergency']).optional(),
  /** Filter by impact level */
  impactLevel: z.enum(['major', 'high', 'medium', 'low', 'very_low']).optional(),
  /** Filter by assigned IT reviewer ID */
  assignedToId: z.string().uuid().optional(),
  /** Filter by requester email */
  requesterEmail: z.string().email().optional(),
  /** Filter by creation date (from) - ISO date string */
  createdFrom: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  /** Filter by creation date (to) - ISO date string */
  createdTo: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  /** Page number (default 1) */
  page: z.coerce.number().int().min(1).default(1),
  /** Page size (default 20, max 100) */
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  /** Sort field */
  sortBy: z.enum(['createdAt', 'crNumber', 'impactLevel', 'changeType']).default('createdAt'),
  /** Sort order (default 'desc') */
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CRSearchQuery = z.infer<typeof CRSearchQuerySchema>;

/** Parsed search query with all defaults applied */
export interface CRSearchQueryParsed {
  search?: string;
  changeType?: string;
  impactLevel?: string;
  assignedToId?: string;
  requesterEmail?: string;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
