import { z } from 'zod';

/**
 * Known entity types in the ACR Management System.
 * Used to validate entityType field in audit log entries.
 */
export const KNOWN_ENTITY_TYPES = [
  'User',
  'Role',
  'ChangeRequest',
  'WorkflowDefinition',
  'WorkflowStep',
  'WorkflowCondition',
  'WorkflowInstance',
  'Approval',
  'Attachment',
  'Notification',
  'MasterData',
] as const;

export type KnownEntityType = (typeof KNOWN_ENTITY_TYPES)[number];

/**
 * Zod schema for CreateAuditLogDto validation.
 */
export const CreateAuditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().max(255),
  action: z.string().min(1).max(50),
  entityType: z.enum(KNOWN_ENTITY_TYPES),
  entityId: z.string().uuid(),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  ipAddress: z.string().max(45).optional(),
});

/**
 * DTO for creating an audit log entry.
 * Append-only — no update or delete operations are supported.
 */
export interface CreateAuditLogDto {
  /** User ID (nullable for anonymous/system actions) */
  userId?: string;
  /** Email of the user who performed the action */
  userEmail: string;
  /** Action performed (e.g. "create", "update", "approve", "delete") */
  action: string;
  /** Entity type affected */
  entityType: KnownEntityType;
  /** ID of the entity affected */
  entityId: string;
  /** Previous value (null for create actions) */
  oldValue?: unknown;
  /** New value (null for delete actions) */
  newValue?: unknown;
  /** Client IP address */
  ipAddress?: string;
}
