import { BadRequestException } from '@nestjs/common';
import { ApprovalService } from '../../../src/modules/approval/approval.service';
import { ApprovalRepository } from '../../../src/modules/approval/approval.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ChangeRequestService } from '../../../src/modules/change-request/change-request.service';
import { ChangeRequestRepository } from '../../../src/modules/change-request/change-request.repository';
import { WorkflowEngineService } from '../../../src/modules/workflow/workflow-engine.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';
import { AuditService } from '../../../src/modules/audit/audit.service';

describe('Emergency Change — Post-Approval Flow', () => {
  let approvalService: ApprovalService;
  let crService: ChangeRequestService;
  let mockApprovalRepository: jest.Mocked<ApprovalRepository>;
  let mockPrismaService: any;
  let mockCrRepository: jest.Mocked<ChangeRequestRepository>;
  let mockWorkflowEngine: jest.Mocked<WorkflowEngineService>;
  let mockWorkflowRepository: jest.Mocked<WorkflowRepository>;
  let mockAuditService: jest.Mocked<AuditService>;

  // ─── Step Fixtures ──────────────────────────────────────────────────────────

  const mockImplementationStep = {
    id: 'step-implementation',
    name: 'Implementation',
    stepType: 'implementation',
    assignedRole: 'implementer',
    requiredFields: null,
    sortOrder: 4,
    defaultNextStepId: 'step-verification',
  };

  const mockVerificationStep = {
    id: 'step-verification',
    name: 'Verification',
    stepType: 'verification',
    assignedRole: 'it_reviewer',
    requiredFields: null,
    sortOrder: 5,
    defaultNextStepId: 'step-closed',
  };

  const mockClosedStep = {
    id: 'step-closed',
    name: 'Closed',
    stepType: 'end',
    assignedRole: 'system',
    requiredFields: null,
    sortOrder: 6,
    defaultNextStepId: null,
  };

  const mockApprovalStep = {
    id: 'step-approval',
    name: 'Approval',
    stepType: 'approval',
    assignedRole: 'approver',
    requiredFields: null,
    sortOrder: 3,
    defaultNextStepId: 'step-implementation',
  };

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeEach(() => {
    mockApprovalRepository = {
      create: jest.fn(),
      findByChangeRequestId: jest.fn(),
      findPendingForUser: jest.fn(),
    } as unknown as jest.Mocked<ApprovalRepository>;

    mockPrismaService = {
      changeRequest: {
        findUnique: jest.fn(),
      },
    };

    approvalService = new ApprovalService(
      mockApprovalRepository,
      mockPrismaService as unknown as PrismaService,
    );

    mockCrRepository = {
      findById: jest.fn(),
      findByCrNumber: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      generateNextCrNumber: jest.fn(),
    } as unknown as jest.Mocked<ChangeRequestRepository>;

    mockWorkflowEngine = {
      createInstance: jest.fn(),
      transition: jest.fn(),
      evaluateConditions: jest.fn(),
      getCurrentStep: jest.fn(),
      getInstanceStatus: jest.fn(),
    } as unknown as jest.Mocked<WorkflowEngineService>;

    mockWorkflowRepository = {
      findActiveDefault: jest.fn(),
      findDefinitionById: jest.fn(),
      findAllDefinitions: jest.fn(),
      createDefinition: jest.fn(),
      updateDefinition: jest.fn(),
      createStep: jest.fn(),
      createCondition: jest.fn(),
      findStepById: jest.fn(),
      findStepsByDefinitionId: jest.fn(),
      findConditionsByDefinitionId: jest.fn(),
      createInstance: jest.fn(),
      findInstanceById: jest.fn(),
      updateInstance: jest.fn(),
      findConditionsByFromStepId: jest.fn(),
    } as unknown as jest.Mocked<WorkflowRepository>;

    mockAuditService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEntity: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    // Create a mock ApprovalService for the ChangeRequestService
    const approvalServiceForCr = {
      hasApproval: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      postApprove: jest.fn(),
      getPendingApprovals: jest.fn(),
      getApprovalHistory: jest.fn(),
    } as unknown as jest.Mocked<ApprovalService>;

    crService = new ChangeRequestService(
      mockCrRepository,
      mockWorkflowEngine,
      mockWorkflowRepository,
      mockAuditService,
      approvalServiceForCr,
    );
  });

  // ─── postApprove ────────────────────────────────────────────────────────────

  describe('postApprove', () => {
    it('should create a post-approval record for an emergency CR at Implementation step', async () => {
      const crId = 'cr-emergency-001';
      const approverId = 'approver-001';
      const approverName = 'Emergency Approver';
      const approverPosition = 'IT Director';
      const reason = 'Retroactive approval for critical fix';

      // Mock CR as emergency type at implementation step
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        id: crId,
        changeType: 'emergency',
        workflowInstance: {
          id: 'wf-instance-001',
          currentStep: {
            stepType: 'implementation',
            name: 'Implementation',
          },
        },
      });

      const expectedApproval = {
        id: 'approval-001',
        changeRequestId: crId,
        approverId,
        action: 'post_approve',
        reason,
        approverName,
        approverPosition,
        createdAt: new Date('2025-01-20T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval as any);

      const result = await approvalService.postApprove(
        crId,
        approverId,
        approverName,
        approverPosition,
        reason,
      );

      expect(result).toEqual(expectedApproval);
      expect(mockApprovalRepository.create).toHaveBeenCalledWith({
        changeRequestId: crId,
        approverId,
        action: 'post_approve',
        reason,
        approverName,
        approverPosition,
      });
    });

    it('should create a post-approval record for an emergency CR at Verification step', async () => {
      const crId = 'cr-emergency-002';
      const approverId = 'approver-001';
      const approverName = 'Emergency Approver';

      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        id: crId,
        changeType: 'emergency',
        workflowInstance: {
          id: 'wf-instance-002',
          currentStep: {
            stepType: 'verification',
            name: 'Verification',
          },
        },
      });

      const expectedApproval = {
        id: 'approval-002',
        changeRequestId: crId,
        approverId,
        action: 'post_approve',
        reason: undefined,
        approverName,
        approverPosition: null,
        createdAt: new Date('2025-01-20T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval as any);

      const result = await approvalService.postApprove(
        crId,
        approverId,
        approverName,
      );

      expect(result).toEqual(expectedApproval);
      expect(mockApprovalRepository.create).toHaveBeenCalledWith({
        changeRequestId: crId,
        approverId,
        action: 'post_approve',
        reason: undefined,
        approverName,
        approverPosition: undefined,
      });
    });

    it('should throw BadRequestException if CR is not emergency type', async () => {
      const crId = 'cr-normal-001';
      const approverId = 'approver-001';
      const approverName = 'Approver';

      // Mock CR as normal type
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        id: crId,
        changeType: 'normal',
        workflowInstance: {
          id: 'wf-instance-003',
          currentStep: {
            stepType: 'implementation',
            name: 'Implementation',
          },
        },
      });

      await expect(
        approvalService.postApprove(crId, approverId, approverName),
      ).rejects.toThrow(BadRequestException);

      await expect(
        approvalService.postApprove(crId, approverId, approverName),
      ).rejects.toThrow('Post-approval is only applicable to Emergency change requests');

      expect(mockApprovalRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if CR is at wrong step (e.g., approval)', async () => {
      const crId = 'cr-emergency-003';
      const approverId = 'approver-001';
      const approverName = 'Approver';

      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        id: crId,
        changeType: 'emergency',
        workflowInstance: {
          id: 'wf-instance-004',
          currentStep: {
            stepType: 'approval',
            name: 'Approval',
          },
        },
      });

      await expect(
        approvalService.postApprove(crId, approverId, approverName),
      ).rejects.toThrow(BadRequestException);

      await expect(
        approvalService.postApprove(crId, approverId, approverName),
      ).rejects.toThrow('Post-approval can only be performed at Implementation or Verification step');

      expect(mockApprovalRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─── Close enforcement ──────────────────────────────────────────────────────

  describe('close — emergency post-approval enforcement', () => {
    function makeEmergencyCr(step: any, overrides: Record<string, unknown> = {}) {
      return {
        id: 'cr-emergency-close-001',
        crNumber: 'CR-2025-0010',
        requesterId: 'user-001',
        assignedToId: 'user-002',
        workflowInstanceId: 'wf-instance-010',
        changeType: 'emergency',
        impactLevel: 'high',
        affectedService: 'Production DB',
        description: 'Emergency fix for critical production issue',
        justification: 'System down',
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@dits.co.th',
        requesterDepartment: 'IT',
        approverRequestEmail: null,
        impactAnalysis: 'Critical system affected',
        riskAssessment: 'High risk if not fixed',
        implementationPlan: 'Direct patch',
        rolloutPlan: 'Immediate',
        rollbackPlan: 'Revert commit',
        testResult: 'pass',
        testAction: null,
        implementerNotes: 'Applied hotfix',
        versionBefore: '1.0.0',
        versionAfter: '1.0.1',
        downtimeStart: null,
        downtimeEnd: null,
        verificationResult: 'success',
        closureReason: null,
        emergencyReason: 'Production system down',
        version: 1,
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
        workflowInstance: {
          id: 'wf-instance-010',
          status: 'active',
          currentStep: step,
        },
        ...overrides,
      };
    }

    it('should throw BadRequestException when closing emergency CR without approval', async () => {
      const cr = makeEmergencyCr({
        name: 'Verification',
        stepType: 'verification',
        assignedRole: 'it_reviewer',
      });

      mockCrRepository.findById.mockResolvedValue(cr as any);

      // Mock the approvalService.hasApproval on the crService's internal reference
      const approvalServiceMock = (crService as any).approvalService;
      approvalServiceMock.hasApproval.mockResolvedValue(false);

      await expect(
        crService.close('cr-emergency-close-001', 'user-001', 'Closing emergency CR'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        crService.close('cr-emergency-close-001', 'user-001', 'Closing emergency CR'),
      ).rejects.toThrow('Emergency changes require post-approval before closing');
    });

    it('should allow closing emergency CR when post-approval exists', async () => {
      const cr = makeEmergencyCr({
        name: 'Verification',
        stepType: 'verification',
        assignedRole: 'it_reviewer',
      });

      const closedCr = makeEmergencyCr(
        { name: 'Closed', stepType: 'end', assignedRole: 'system' },
        { closureReason: 'Emergency fix verified and approved' },
      );

      mockCrRepository.findById
        .mockResolvedValueOnce(cr as any)  // initial fetch
        .mockResolvedValueOnce(closedCr as any);  // re-fetch after close

      // Mock the approvalService.hasApproval on the crService's internal reference
      const approvalServiceMock = (crService as any).approvalService;
      approvalServiceMock.hasApproval.mockResolvedValue(true);

      mockCrRepository.update.mockResolvedValue(closedCr as any);
      mockWorkflowEngine.transition.mockResolvedValue({} as any);

      const result = await crService.close(
        'cr-emergency-close-001',
        'user-001',
        'Emergency fix verified and approved',
      );

      expect(result).toEqual(closedCr);
      expect(approvalServiceMock.hasApproval).toHaveBeenCalledWith('cr-emergency-close-001');
    });

    it('should NOT check approval for normal CR close', async () => {
      const normalCr = {
        id: 'cr-normal-close-001',
        crNumber: 'CR-2025-0011',
        requesterId: 'user-001',
        assignedToId: 'user-002',
        workflowInstanceId: 'wf-instance-011',
        changeType: 'normal',
        impactLevel: 'medium',
        affectedService: 'Internal App',
        description: 'Normal update',
        justification: null,
        requesterName: 'John Doe',
        requesterEmail: 'john@dits.co.th',
        requesterDepartment: 'IT',
        approverRequestEmail: null,
        impactAnalysis: 'Minor',
        riskAssessment: 'Low',
        implementationPlan: 'Standard deploy',
        rolloutPlan: 'Phased',
        rollbackPlan: 'Revert',
        testResult: 'pass',
        testAction: null,
        implementerNotes: 'Deployed successfully',
        versionBefore: '2.0.0',
        versionAfter: '2.1.0',
        downtimeStart: null,
        downtimeEnd: null,
        verificationResult: 'success',
        closureReason: null,
        emergencyReason: null,
        version: 1,
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
        workflowInstance: {
          id: 'wf-instance-011',
          status: 'active',
          currentStep: {
            name: 'Verification',
            stepType: 'verification',
            assignedRole: 'it_reviewer',
          },
        },
      };

      const closedNormalCr = {
        ...normalCr,
        closureReason: 'Completed successfully',
        workflowInstance: {
          id: 'wf-instance-011',
          status: 'completed',
          currentStep: {
            name: 'Closed',
            stepType: 'end',
            assignedRole: 'system',
          },
        },
      };

      mockCrRepository.findById
        .mockResolvedValueOnce(normalCr as any)
        .mockResolvedValueOnce(closedNormalCr as any);
      mockCrRepository.update.mockResolvedValue(closedNormalCr as any);
      mockWorkflowEngine.transition.mockResolvedValue({} as any);

      const approvalServiceMock = (crService as any).approvalService;

      const result = await crService.close(
        'cr-normal-close-001',
        'user-001',
        'Completed successfully',
      );

      expect(result).toEqual(closedNormalCr);
      // hasApproval should NOT be called for normal CRs
      expect(approvalServiceMock.hasApproval).not.toHaveBeenCalled();
    });
  });

  // ─── Full Emergency Flow ────────────────────────────────────────────────────

  describe('emergency flow: create → submit → assign → review → implement → postApprove → verify → close', () => {
    it('should complete the full emergency change workflow with post-approval', async () => {
      // This test verifies the conceptual flow, testing individual service calls in sequence

      const crId = 'cr-emergency-flow-001';
      const approverId = 'approver-flow-001';
      const approverName = 'Flow Approver';

      // 1. postApprove — simulate an emergency CR at implementation step
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        id: crId,
        changeType: 'emergency',
        workflowInstance: {
          id: 'wf-instance-flow-001',
          currentStep: {
            stepType: 'implementation',
            name: 'Implementation',
          },
        },
      });

      const postApprovalRecord = {
        id: 'approval-flow-001',
        changeRequestId: crId,
        approverId,
        action: 'post_approve',
        reason: 'Retroactive approval for emergency fix',
        approverName,
        approverPosition: 'CTO',
        createdAt: new Date('2025-01-20T12:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(postApprovalRecord as any);

      const approval = await approvalService.postApprove(
        crId,
        approverId,
        approverName,
        'CTO',
        'Retroactive approval for emergency fix',
      );

      expect(approval.action).toBe('post_approve');
      expect(approval.changeRequestId).toBe(crId);

      // 2. hasApproval — verify the approval exists
      mockApprovalRepository.findByChangeRequestId.mockResolvedValue([
        postApprovalRecord as any,
      ]);

      const hasApproval = await approvalService.hasApproval(crId);
      expect(hasApproval).toBe(true);

      // 3. Close should now succeed (tested via crService with mocked approvalService)
      const emergencyCrAtVerification = {
        id: crId,
        crNumber: 'CR-2025-0020',
        changeType: 'emergency',
        version: 1,
        workflowInstance: {
          id: 'wf-instance-flow-001',
          status: 'active',
          currentStep: {
            name: 'Verification',
            stepType: 'verification',
            assignedRole: 'it_reviewer',
          },
        },
      };

      const closedCr = {
        ...emergencyCrAtVerification,
        closureReason: 'Emergency resolved',
        workflowInstance: {
          id: 'wf-instance-flow-001',
          status: 'completed',
          currentStep: {
            name: 'Closed',
            stepType: 'end',
            assignedRole: 'system',
          },
        },
      };

      mockCrRepository.findById
        .mockResolvedValueOnce(emergencyCrAtVerification as any)
        .mockResolvedValueOnce(closedCr as any);
      mockCrRepository.update.mockResolvedValue(closedCr as any);
      mockWorkflowEngine.transition.mockResolvedValue({} as any);

      const approvalServiceMock = (crService as any).approvalService;
      approvalServiceMock.hasApproval.mockResolvedValue(true);

      const result = await crService.close(crId, 'user-001', 'Emergency resolved');

      expect(result.workflowInstance.currentStep.stepType).toBe('end');
      expect(approvalServiceMock.hasApproval).toHaveBeenCalledWith(crId);
    });
  });
});
