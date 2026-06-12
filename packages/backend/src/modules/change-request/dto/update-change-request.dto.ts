import { z } from 'zod';
import { IMPACT_LEVELS, CHANGE_TYPES } from './create-change-request.dto';

/** Valid test result values */
export const TEST_RESULTS = ['pass', 'failed', 'pending'] as const;
export type TestResult = (typeof TEST_RESULTS)[number];

/** Valid test action values */
export const TEST_ACTIONS = ['restore', 'vendor', 'retest', 'other'] as const;
export type TestAction = (typeof TEST_ACTIONS)[number];

/** Valid verification result values */
export const VERIFICATION_RESULTS = ['success', 'failed'] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

/**
 * Zod schema for UpdateChangeRequestDto validation.
 * All fields are optional — only provided fields are updated.
 * The version field is required for optimistic locking.
 */
export const UpdateChangeRequestSchema = z.object({
  // Basic fields (editable during early steps)
  changeType: z.enum(CHANGE_TYPES).optional(),
  impactLevel: z.enum(IMPACT_LEVELS).optional(),
  affectedService: z.string().min(1).max(100).optional(),
  description: z.string().min(1).optional(),
  justification: z.string().optional(),
  requesterDepartment: z.string().max(100).optional(),
  approverRequestEmail: z.string().email().max(255).optional(),
  emergencyReason: z.string().optional(),

  // IT Review fields
  impactAnalysis: z.string().optional(),
  riskAssessment: z.string().optional(),
  implementationPlan: z.string().optional(),
  rolloutPlan: z.string().optional(),
  rollbackPlan: z.string().optional(),

  // Testing fields
  testResult: z.enum(TEST_RESULTS).optional(),
  testAction: z.enum(TEST_ACTIONS).optional(),

  // Implementation fields
  implementerNotes: z.string().optional(),
  versionBefore: z.string().max(100).optional(),
  versionAfter: z.string().max(100).optional(),
  downtimeStart: z.coerce.date().optional(),
  downtimeEnd: z.coerce.date().optional(),

  // Verification fields
  verificationResult: z.enum(VERIFICATION_RESULTS).optional(),

  // Closure fields
  closureReason: z.string().optional(),

  // Assignment
  assignedToId: z.string().uuid().optional(),

  // Optimistic locking — required for update
  version: z.number().int().min(1),
});

/**
 * DTO for updating a change request.
 * Only provided fields are updated; version is required for optimistic locking.
 */
export interface UpdateChangeRequestDto {
  changeType?: string;
  impactLevel?: string;
  affectedService?: string;
  description?: string;
  justification?: string;
  requesterDepartment?: string;
  approverRequestEmail?: string;
  emergencyReason?: string;
  impactAnalysis?: string;
  riskAssessment?: string;
  implementationPlan?: string;
  rolloutPlan?: string;
  rollbackPlan?: string;
  testResult?: string;
  testAction?: string;
  implementerNotes?: string;
  versionBefore?: string;
  versionAfter?: string;
  downtimeStart?: Date;
  downtimeEnd?: Date;
  verificationResult?: string;
  closureReason?: string;
  assignedToId?: string;
  /** Required — current version for optimistic locking */
  version: number;
}
