// @acr/shared — constants and enums

/** System roles */
export const RoleName = {
  REQUESTER: 'requester',
  APPROVER_REQUEST: 'approver_request',
  CALL_CENTER: 'call_center',
  IT_REVIEWER: 'it_reviewer',
  APPROVER: 'approver',
  IMPLEMENTER: 'implementer',
  AUDITOR: 'auditor',
  ADMIN: 'admin',
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

/** Change request types */
export const ChangeType = {
  NORMAL: 'normal',
  EMERGENCY: 'emergency',
} as const;

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

/** Impact levels */
export const ImpactLevel = {
  MAJOR: 'major',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  VERY_LOW: 'very_low',
} as const;

export type ImpactLevel = (typeof ImpactLevel)[keyof typeof ImpactLevel];

/** Workflow step types */
export const WorkflowStepType = {
  START: 'start',
  REVIEW: 'review',
  APPROVAL: 'approval',
  IMPLEMENTATION: 'implementation',
  VERIFICATION: 'verification',
  END: 'end',
} as const;

export type WorkflowStepType = (typeof WorkflowStepType)[keyof typeof WorkflowStepType];

/** Workflow instance statuses */
export const WorkflowStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

/** Test results */
export const TestResult = {
  PASS: 'pass',
  FAILED: 'failed',
  PENDING: 'pending',
} as const;

export type TestResult = (typeof TestResult)[keyof typeof TestResult];

/** Actions when test fails */
export const TestAction = {
  RESTORE: 'restore',
  VENDOR: 'vendor',
  RETEST: 'retest',
  OTHER: 'other',
} as const;

export type TestAction = (typeof TestAction)[keyof typeof TestAction];

/** Verification results */
export const VerificationResult = {
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type VerificationResult = (typeof VerificationResult)[keyof typeof VerificationResult];

/** Approval actions */
export const ApprovalAction = {
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type ApprovalAction = (typeof ApprovalAction)[keyof typeof ApprovalAction];

/** Workflow condition operators */
export const ConditionOperator = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  IN: 'in',
  GREATER_THAN: 'greater_than',
} as const;

export type ConditionOperator = (typeof ConditionOperator)[keyof typeof ConditionOperator];

/** Notification types */
export const NotificationType = {
  CR_SUBMITTED: 'cr_submitted',
  CR_ASSIGNED: 'cr_assigned',
  CR_APPROVED: 'cr_approved',
  CR_REJECTED: 'cr_rejected',
  CR_IMPLEMENTATION_READY: 'cr_implementation_ready',
  CR_VERIFICATION_REQUIRED: 'cr_verification_required',
  CR_COMPLETED: 'cr_completed',
  CR_CANCELLED: 'cr_cancelled',
  APPROVAL_REQUIRED: 'approval_required',
  WORKFLOW_STEP_CHANGED: 'workflow_step_changed',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Master data categories */
export const MasterDataCategory = {
  SERVICE: 'service',
  IMPACT_LEVEL: 'impact_level',
  CHANGE_TYPE: 'change_type',
} as const;

export type MasterDataCategory = (typeof MasterDataCategory)[keyof typeof MasterDataCategory];

// ─── Convenience Constants ──────────────────────────────────────────────────

/** All system roles as a flat constant object */
export const ROLES = RoleName;

/** Default workflow step names in order */
export const WORKFLOW_STATUSES = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IT_REVIEW: 'IT Review',
  APPROVAL: 'Approval',
  IMPLEMENTATION: 'Implementation',
  VERIFICATION: 'Verification',
  CLOSED: 'Closed',
} as const;

/** Maximum allowed file upload size in MB */
export const MAX_FILE_SIZE_MB = 10;
