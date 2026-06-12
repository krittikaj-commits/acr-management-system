import { z } from 'zod';

/**
 * Valid operators for workflow conditions.
 */
export const WORKFLOW_CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'in',
  'greater_than',
] as const;

export type WorkflowConditionOperator =
  (typeof WORKFLOW_CONDITION_OPERATORS)[number];

/**
 * Zod schema for CreateWorkflowConditionDto validation.
 */
export const CreateWorkflowConditionSchema = z.object({
  workflowDefinitionId: z.string().uuid(),
  fromStepId: z.string().uuid(),
  toStepId: z.string().uuid(),
  fieldName: z.string().min(1).max(100),
  operator: z.enum(WORKFLOW_CONDITION_OPERATORS),
  value: z.string().min(1).max(255),
  priority: z.number().int().min(0).default(0),
});

/**
 * DTO for creating a workflow condition (routing rule between steps).
 */
export interface CreateWorkflowConditionDto {
  /** Workflow definition this condition belongs to */
  workflowDefinitionId: string;
  /** Source step ID */
  fromStepId: string;
  /** Destination step ID */
  toStepId: string;
  /** Field name to evaluate (e.g. "impactLevel", "changeType") */
  fieldName: string;
  /** Comparison operator */
  operator: WorkflowConditionOperator;
  /** Value to compare against */
  value: string;
  /** Evaluation priority (higher priority evaluated first) */
  priority: number;
}
