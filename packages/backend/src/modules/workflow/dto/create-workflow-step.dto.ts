import { z } from 'zod';

/**
 * Valid step types for a workflow step.
 */
export const WORKFLOW_STEP_TYPES = [
  'start',
  'review',
  'approval',
  'implementation',
  'verification',
  'end',
] as const;

export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

/**
 * Zod schema for CreateWorkflowStepDto validation.
 */
export const CreateWorkflowStepSchema = z.object({
  workflowDefinitionId: z.string().uuid(),
  name: z.string().min(1).max(100),
  stepType: z.enum(WORKFLOW_STEP_TYPES),
  assignedRole: z.string().min(1).max(50),
  requiredFields: z.array(z.string()).optional(),
  sortOrder: z.number().int().min(0),
  defaultNextStepId: z.string().uuid().optional(),
});

/**
 * DTO for creating a workflow step.
 */
export interface CreateWorkflowStepDto {
  /** Workflow definition this step belongs to */
  workflowDefinitionId: string;
  /** Step name (e.g. "IT Review") */
  name: string;
  /** Type of step */
  stepType: WorkflowStepType;
  /** Role responsible for this step */
  assignedRole: string;
  /** Fields that must be filled before advancing to the next step */
  requiredFields?: string[];
  /** Display order */
  sortOrder: number;
  /** Default next step ID */
  defaultNextStepId?: string;
}
