import { z } from 'zod';

/**
 * Zod schema for CreateWorkflowDefinitionDto validation.
 */
export const CreateWorkflowDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * DTO for creating a workflow definition.
 */
export interface CreateWorkflowDefinitionDto {
  /** Workflow name */
  name: string;
  /** Additional configuration metadata */
  metadata?: Record<string, unknown>;
  /** Whether this is the default workflow for new CRs */
  isDefault?: boolean;
}
