import type { ApprovalAction } from '../constants/index.js';

/** Approval entity interface */
export interface IApproval {
  id: string;
  changeRequestId: string;
  approverId: string;
  action: ApprovalAction;
  reason: string | null;
  approverName: string;
  approverPosition: string;
  createdAt: Date;
}
