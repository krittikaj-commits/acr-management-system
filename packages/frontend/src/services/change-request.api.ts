import { api } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ICRListItem {
  id: string;
  crNumber: string;
  changeType: string;
  impactLevel: string;
  affectedService: string;
  requesterName: string;
  requesterEmail: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  currentStep: string;
  workflowStatus: string;
}

export interface ICRDetail {
  id: string;
  crNumber: string;
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
  downtimeStart: string | null;
  downtimeEnd: string | null;
  verificationResult: string | null;
  closureReason: string | null;
  emergencyReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  workflowInstance: {
    id: string;
    status: string;
    currentStep: { id: string; name: string; stepType: string; assignedRole: string };
  };
  attachments: IAttachmentItem[];
}

export interface IAttachmentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  workflowStep: string;
  createdAt: string;
}

export interface IAuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ICRListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  changeType?: string;
  impactLevel?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ITrackingResponse {
  crNumber: string;
  changeType: string;
  impactLevel: string;
  affectedService: string;
  description: string;
  requesterName: string;
  createdAt: string;
  currentStep: string;
  workflowStatus: string;
  timeline: IAuditLogEntry[];
}

// ─── API Methods ────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of Change Requests with filters.
 */
export async function fetchChangeRequests(
  params: ICRListParams,
): Promise<IPaginatedResponse<ICRListItem>> {
  const response = await api.get<{ data: IPaginatedResponse<ICRListItem> }>(
    '/change-requests',
    { params },
  );
  return response.data.data;
}

/**
 * Fetch a single Change Request by ID.
 */
export async function fetchChangeRequestById(id: string): Promise<ICRDetail> {
  const response = await api.get<{ data: ICRDetail }>(
    `/change-requests/${id}`,
  );
  return response.data.data;
}

/**
 * Fetch audit history for a Change Request.
 */
export async function fetchCRHistory(id: string): Promise<IAuditLogEntry[]> {
  const response = await api.get<{ data: IAuditLogEntry[] }>(
    `/change-requests/${id}/history`,
  );
  return response.data.data;
}

/**
 * Submit a CR to the next workflow step.
 */
export async function submitChangeRequest(id: string): Promise<void> {
  await api.post(`/change-requests/${id}/submit`);
}

/**
 * Get presigned download URL for an attachment.
 */
export async function getAttachmentDownloadUrl(
  attachmentId: string,
): Promise<string> {
  const response = await api.get<{ data: { downloadUrl: string } }>(
    `/attachments/${attachmentId}/download-url`,
  );
  return response.data.data.downloadUrl;
}

/**
 * Verify an anonymous/approval tracking token and get CR tracking data.
 */
export async function verifyTrackingToken(
  token: string,
): Promise<ITrackingResponse> {
  const response = await api.get<{ data: ITrackingResponse }>(
    `/auth/verify-token/${token}`,
  );
  return response.data.data;
}

/**
 * Create a new Change Request (anonymous or authenticated).
 */
export async function createChangeRequest(
  data: Record<string, unknown>,
): Promise<ICRDetail> {
  const response = await api.post<{ data: ICRDetail }>(
    '/change-requests',
    data,
  );
  return response.data.data;
}
