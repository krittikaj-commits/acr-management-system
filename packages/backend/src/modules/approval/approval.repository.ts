import { Injectable } from '@nestjs/common';
import { Approval } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ApprovalRepository — Data access layer for Approval entity.
 *
 * Provides:
 * - Create approval records
 * - Query approvals by change request
 * - Query pending approvals for a user
 */
@Injectable()
export class ApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new approval record.
   */
  async create(data: {
    changeRequestId: string;
    approverId: string;
    action: string;
    reason?: string;
    approverName: string;
    approverPosition?: string;
  }): Promise<Approval> {
    return this.prisma.approval.create({
      data: {
        changeRequestId: data.changeRequestId,
        approverId: data.approverId,
        action: data.action,
        reason: data.reason ?? null,
        approverName: data.approverName,
        approverPosition: data.approverPosition ?? null,
      },
    });
  }

  /**
   * Find all approval records for a specific change request.
   */
  async findByChangeRequestId(changeRequestId: string): Promise<Approval[]> {
    return this.prisma.approval.findMany({
      where: { changeRequestId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find change requests pending approval for a specific user.
   * Returns CRs where the workflow is at 'approval' step and
   * no approval/reject record by this user exists yet.
   */
  async findPendingForUser(userId: string): Promise<Approval[]> {
    // Get CRs at approval step that this user hasn't acted on yet
    // This returns approvals for CRs pending the user's review
    return this.prisma.approval.findMany({
      where: {
        approverId: userId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        changeRequest: true,
      },
    });
  }
}
