// @acr/shared — shared types, constants, and utilities

// Types
export type {
  IUser,
  IRole,
  IChangeRequest,
  IWorkflowDefinition,
  IWorkflowStep,
  IWorkflowCondition,
  IWorkflowInstance,
  IApproval,
  IAttachment,
  IAuditLog,
  INotification,
  IMasterData,
} from './types/index.js';

// Constants
export {
  RoleName,
  ChangeType,
  ImpactLevel,
  WorkflowStepType,
  WorkflowStatus,
  TestResult,
  TestAction,
  VerificationResult,
  ApprovalAction,
  ConditionOperator,
  NotificationType,
  MasterDataCategory,
  ROLES,
  WORKFLOW_STATUSES,
  MAX_FILE_SIZE_MB,
} from './constants/index.js';

// Re-export constant types for convenience
export type {
  RoleName as RoleNameType,
  ChangeType as ChangeTypeValue,
  ImpactLevel as ImpactLevelValue,
  WorkflowStepType as WorkflowStepTypeValue,
  WorkflowStatus as WorkflowStatusValue,
  TestResult as TestResultValue,
  TestAction as TestActionValue,
  VerificationResult as VerificationResultValue,
  ApprovalAction as ApprovalActionValue,
  ConditionOperator as ConditionOperatorValue,
  NotificationType as NotificationTypeValue,
  MasterDataCategory as MasterDataCategoryValue,
} from './constants/index.js';
