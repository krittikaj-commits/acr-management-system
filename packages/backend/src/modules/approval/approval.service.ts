import { Injectable, BadRequestException } from '@nestjs/common';
import { Approval } from '@prisma/client';
import { ApprovalRepository } from './approval.repository';
import { PrismaService } from '../../prisma/prisma.service';

/** Result of an approval action, may include BR-010 warning */
export interface ApprovalResult {
  approval: Approval;
  warning?: string;
}

/**
 * ApprovalService — Business logic for approval record management.
 *
 * Responsibilities:
 * - Create approval records (approve/reject)
 * - Enforce BR-010: approver ≠ implementer (warning only, not blocking)
 * - Validate rejection requires a reason
 * - Query pending approvals and approval history
 */
@Injectable()
export class ApprovalService {
  constructor(
    private readonly approvalRepository: ApprovalRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Approve a change request.
   * - Creates an Approval record with action='approve'
   * - Checks BR-010: if the approver is also the assigned implementer, returns a warning
   * - The approval still proceeds even if BR-010 is violated (warning only)
   *
   * @param crId - Change request ID
   * @param approverId - User ID of the approver
   * @param approverName - Display name of the approver
   * @param approverPosition - Position/title of the approver (optional)
   * @param reason - Optional reason for approval
   * @returns ApprovalResult with the approval record and optional BR-010 warning
   */
  async approve(
    crId: string,
    approverId: string,
    approverName: string,
    approverPosition?: string,
    reason?: string,
  ): Promise<ApprovalResult> {
    // Create the approval record
    const approval = await this.approvalRepository.create({
      changeRequestId: crId,
      approverId,
      action: 'approve',
      reason,
      approverName,
      approverPosition,
    });

    // BR-010: Check if approver is the same as the assigned implementer
    const warning = await this.checkBR010(crId, approverId);

    return { approval, warning };
  }

  /**
   * Reject a change request.
   * - Validates that a reason is provided (required for rejection)
   * - Creates an Approval record with action='reject'
   *
   * @param crId - Change request ID
   * @param approverId - User ID of the approver/rejector
   * @param approverName - Display name of the approver
   * @param approverPosition - Position/title of the approver (optional)
   * @param reason - Reason for rejection (required)
   * @returns The created Approval record
   * @throws BadRequestException if reason is empty
   */
  async reject(
    crId: string,
    approverId: string,
    approverName: string,
    approverPosition?: string,
    reason?: string,
  ): Promise<Approval> {
    // Validate reason is provided and non-empty
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException(
        'Rejection reason is required',
      );
    }

    return this.approvalRepository.create({
      changeRequestId: crId,
      approverId,
      action: 'reject',
      reason,
      approverName,
      approverPosition,
    });
  }

  /**
   * Post-approve an emergency change request.
   * Emergency CRs skip the normal approval step and proceed directly to Implementation.
   * However, before the CR can be closed, a post-approval must be recorded.
   *
   * - Validates CR is an emergency type
   * - Validates CR is at Implementation or Verification step (post-implementation)
   * - Creates Approval record with action='post_approve'
   *
   * @param crId - Change request ID
   * @param approverId - User ID of the approver
   * @param approverName - Display name of the approver
   * @param approverPosition - Position/title of the approver (optional)
   * @param reason - Optional reason for post-approval
   * @returns The created Approval record
   * @throws BadRequestException if CR is not emergency type or not at correct step
   */
  async postApprove(
    crId: string,
    approverId: string,
    approverName: string,
    approverPosition?: string,
    reason?: string,
  ): Promise<Approval> {
    // Fetch the CR to validate changeType and current step
    const cr = await this.prisma.changeRequest.findUnique({
      where: { id: crId },
      include: {
        workflowInstance: {
          include: {
            currentStep: true,
          },
        },
      },
    });

    if (!cr) {
      throw new BadRequestException(`Change request "${crId}" not found`);
    }

    // Validate CR is emergency type
    if (cr.changeType !== 'emergency') {
      throw new BadRequestException(
        'Post-approval is only applicable to Emergency change requests',
      );
    }

    // Validate CR is at Implementation or Verification step
    const currentStepType = (cr.workflowInstance as any)?.currentStep?.stepType;
    if (currentStepType !== 'implementation' && currentStepType !== 'verification') {
      throw new BadRequestException(
        `Post-approval can only be performed at Implementation or Verification step. Current step type: "${currentStepType ?? 'unknown'}"`,
      );
    }

    // Create the approval record with action='post_approve'
    return this.approvalRepository.create({
      changeRequestId: crId,
      approverId,
      action: 'post_approve',
      reason,
      approverName,
      approverPosition,
    });
  }

  /**
   * Check if a change request has at least one approval record (approve or post_approve).
   * Used to enforce post-approval requirement for emergency CRs before closing.
   *
   * @param crId - Change request ID
   * @returns true if at least one approval (approve or post_approve) exists
   */
  async hasApproval(crId: string): Promise<boolean> {
    const approvals = await this.approvalRepository.findByChangeRequestId(crId);
    return approvals.some(
      (a) => a.action === 'approve' || a.action === 'post_approve',
    );
  }

  /**
   * Get all pending approvals for a user.
   *
   * @param userId - The user ID to check pending approvals for
   * @returns List of approval records for the user
   */
  async getPendingApprovals(userId: string): Promise<Approval[]> {
    return this.approvalRepository.findPendingForUser(userId);
  }

  /**
   * Get the full approval history for a change request.
   *
   * @param crId - The change request ID
   * @returns All approval records for the CR, ordered newest first
   */
  async getApprovalHistory(crId: string): Promise<Approval[]> {
    return this.approvalRepository.findByChangeRequestId(crId);
  }

  /**
   * BR-010 Business Rule Check: Approver should not be the same as implementer.
   * This is a WARNING only — does not block the approval.
   *
   * @param crId - Change request ID
   * @param approverId - The approver's user ID
   * @returns Warning message if BR-010 is violated, undefined otherwise
   */
  private async checkBR010(
    crId: string,
    approverId: string,
  ): Promise<string | undefined> {
    const cr = await this.prisma.changeRequest.findUnique({
      where: { id: crId },
      select: { assignedToId: true },
    });

    if (cr && cr.assignedToId === approverId) {
      return 'Approver and implementer should not be the same person (BR-010)';
    }

    return undefined;
  }
}
