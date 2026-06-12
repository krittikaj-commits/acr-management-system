import { z } from 'zod';

/** Valid change types */
export const CHANGE_TYPES = ['normal', 'emergency'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

/** Valid impact levels */
export const IMPACT_LEVELS = [
  'major',
  'high',
  'medium',
  'low',
  'very_low',
] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

/**
 * Zod schema for CreateChangeRequestDto validation.
 */
export const CreateChangeRequestSchema = z.object({
  changeType: z.enum(CHANGE_TYPES),
  impactLevel: z.enum(IMPACT_LEVELS),
  affectedService: z.string().min(1).max(100),
  description: z.string().min(1),
  justification: z.string().optional(),
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email().max(255),
  requesterDepartment: z.string().max(100).optional(),
  approverRequestEmail: z.string().email().max(255).optional(),
  emergencyReason: z.string().optional(),
});

/**
 * DTO for creating a change request.
 */
export interface CreateChangeRequestDto {
  /** Change type: normal or emergency */
  changeType: ChangeType;
  /** Impact level of the change */
  impactLevel: ImpactLevel;
  /** Service affected by the change */
  affectedService: string;
  /** Description of the change */
  description: string;
  /** Justification for the change */
  justification?: string;
  /** Name of the requester */
  requesterName: string;
  /** Email of the requester */
  requesterEmail: string;
  /** Department of the requester */
  requesterDepartment?: string;
  /** Email of the requester's approver (manager) */
  approverRequestEmail?: string;
  /** Reason for emergency change (required when changeType is emergency) */
  emergencyReason?: string;
}
