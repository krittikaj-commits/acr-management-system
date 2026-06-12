/**
 * Response DTO for a change request.
 * Includes workflow status information and excludes internal fields.
 */
export interface ChangeRequestResponseDto {
  id: string;
  crNumber: string;
  requesterId: string | null;
  assignedToId: string | null;
  changeType: string;
  impactLevel: string;
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
  testResult: string | null;
  testAction: string | null;
  implementerNotes: string | null;
  versionBefore: string | null;
  versionAfter: string | null;
  downtimeStart: Date | null;
  downtimeEnd: Date | null;
  verificationResult: string | null;
  closureReason: string | null;
  emergencyReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  // Workflow status (from WorkflowInstance relation)
  workflowStatus: string | null;
  currentStepName: string | null;
  currentStepType: string | null;
  currentStepAssignedRole: string | null;
}

/**
 * Maps a ChangeRequest (with workflow relation) to the response DTO.
 */
export function toChangeRequestResponseDto(
  cr: ChangeRequestWithWorkflow,
): ChangeRequestResponseDto {
  return {
    id: cr.id,
    crNumber: cr.crNumber,
    requesterId: cr.requesterId,
    assignedToId: cr.assignedToId,
    changeType: cr.changeType,
    impactLevel: cr.impactLevel,
    affectedService: cr.affectedService,
    description: cr.description,
    justification: cr.justification,
    requesterName: cr.requesterName,
    requesterEmail: cr.requesterEmail,
    requesterDepartment: cr.requesterDepartment,
    approverRequestEmail: cr.approverRequestEmail,
    impactAnalysis: cr.impactAnalysis,
    riskAssessment: cr.riskAssessment,
    implementationPlan: cr.implementationPlan,
    rolloutPlan: cr.rolloutPlan,
    rollbackPlan: cr.rollbackPlan,
    testResult: cr.testResult,
    testAction: cr.testAction,
    implementerNotes: cr.implementerNotes,
    versionBefore: cr.versionBefore,
    versionAfter: cr.versionAfter,
    downtimeStart: cr.downtimeStart,
    downtimeEnd: cr.downtimeEnd,
    verificationResult: cr.verificationResult,
    closureReason: cr.closureReason,
    emergencyReason: cr.emergencyReason,
    version: cr.version,
    createdAt: cr.createdAt,
    updatedAt: cr.updatedAt,
    workflowStatus: cr.workflowInstance?.status ?? null,
    currentStepName: cr.workflowInstance?.currentStep?.name ?? null,
    currentStepType: cr.workflowInstance?.currentStep?.stepType ?? null,
    currentStepAssignedRole:
      cr.workflowInstance?.currentStep?.assignedRole ?? null,
  };
}

/** Internal type for CR with workflow relations used by the mapper */
export interface ChangeRequestWithWorkflow {
  id: string;
  crNumber: string;
  requesterId: string | null;
  assignedToId: string | null;
  changeType: string;
  impactLevel: string;
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
  testResult: string | null;
  testAction: string | null;
  implementerNotes: string | null;
  versionBefore: string | null;
  versionAfter: string | null;
  downtimeStart: Date | null;
  downtimeEnd: Date | null;
  verificationResult: string | null;
  closureReason: string | null;
  emergencyReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  workflowInstanceId?: string | null;
  workflowInstance?: {
    id: string;
    status: string;
    currentStep?: {
      name: string;
      stepType: string;
      assignedRole: string;
    } | null;
  } | null;
}
