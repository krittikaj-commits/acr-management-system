import { z } from 'zod';

/**
 * Zod schema for UpdateWorkflowDefinitionDto validation.
 */
export const UpdateWorkflowDefinitionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * DTO for updating a workflow definition.
 * All fields are optional (partial update).
 */
export interface UpdateWorkflowDefinitionDto {
  /** Workflow name */
  name?: string;
  /** Additional configuration metadata */
  metadata?: Record<string, unknown>;
  /** Whether this is the default workflow for new CRs */
  isDefault?: boolean;
  /** Whether this workflow is active (archived if false) */
  isActive?: boolean;
}
