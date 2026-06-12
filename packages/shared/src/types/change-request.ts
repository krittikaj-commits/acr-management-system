import type { ChangeType, ImpactLevel, TestResult, TestAction, VerificationResult } from '../constants/index.js';

/** Change Request entity interface */
export interface IChangeRequest {
  id: string;
  crNumber: string;
  requesterId: string | null;
  assignedToId: string | null;
  workflowInstanceId: string;
  changeType: ChangeType;
  impactLevel: ImpactLevel;
  affectedService: string;
  description: string;
  justification: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment: string | null;
  approverRequestEmail: string | null;
  impactAnalysis: string | null;
  riskAssessment: string | null;
  implementationPlan: string | null;
  rolloutPlan: string | null;
  rollbackPlan: string | null;
  testResult: TestResult | null;
  testAction: TestAction | null;
  implementerNotes: string | null;
  versionBefore: string | null;
  versionAfter: string | null;
  downtimeStart: Date | null;
  downtimeEnd: Date | null;
  verificationResult: VerificationResult | null;
  closureReason: string | null;
  emergencyReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
