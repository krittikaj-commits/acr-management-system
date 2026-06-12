import type { WorkflowStepType, WorkflowStatus, ConditionOperator } from '../constants/index.js';

/** Workflow Definition entity interface */
export interface IWorkflowDefinition {
  id: string;
  name: string;
  versionNumber: number;
  isActive: boolean;
  isDefault: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdById: string;
}

/** Workflow Step entity interface */
export interface IWorkflowStep {
  id: string;
  workflowDefinitionId: string;
  name: string;
  stepType: WorkflowStepType;
  assignedRole: string;
  requiredFields: string[] | null;
  sortOrder: number;
  defaultNextStepId: string | null;
  createdAt: Date;
}

/** Workflow Condition entity interface */
export interface IWorkflowCondition {
  id: string;
  workflowDefinitionId: string;
  fromStepId: string;
  toStepId: string;
  fieldName: string;
  operator: ConditionOperator;
  value: string;
  priority: number;
}

/** Workflow Instance entity interface */
export interface IWorkflowInstance {
  id: string;
  workflowDefinitionId: string;
  changeRequestId: string;
  currentStepId: string;
  status: WorkflowStatus;
  workflowVersion: number;
  startedAt: Date;
  completedAt: Date | null;
}
