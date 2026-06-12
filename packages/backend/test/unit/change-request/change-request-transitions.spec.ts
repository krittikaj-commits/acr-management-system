import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChangeRequestService } from '../../../src/modules/change-request/change-request.service';
import { ChangeRequestRepository } from '../../../src/modules/change-request/change-request.repository';
import { WorkflowEngineService } from '../../../src/modules/workflow/workflow-engine.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { ApprovalService } from '../../../src/modules/approval/approval.service';

describe('ChangeRequestService — Workflow Transitions', () => {
  let service: ChangeRequestService;
  let repository: jest.Mocked<ChangeRequestRepository>;
  let workflowEngine: jest.Mocked<WorkflowEngineService>;
  let workflowRepository: jest.Mocked<WorkflowRepository>;
  let auditService: jest.Mocked<AuditService>;
  let approvalService: jest.Mocked<ApprovalService>;

  // ─── Step Fixtures ──────────────────────────────────────────────────────────

  const mockDraftStep = {
    id: 'step-draft',
    workflowDefinitionId: 'wf-def-001',
    name: 'Draft',
    stepType: 'start',
    assignedRole: 'system',
    requiredFields: null,
    sortOrder: 0,
    defaultNextStepId: 'step-submitted',
    createdAt: new Date('2024-01-01'),
  };

  const mockSubmittedStep = {
    id: 'step-submitted',
    workflowDefinitionId: 'wf-def-001',
    name: 'Submitted',
    stepType: 'submitted',
    assignedRole: 'call_center',
    requiredFields: null,
    sortOrder: 1,
    defaultNextStepId: 'step-review',
    createdAt: new Date('2024-01-01'),
  };

  const mockReviewStep = {
    id: 'step-review',
    workflowDefinitionId: 'wf-def-001',
    name: 'IT Review',
    stepType: 'review',
    assignedRole: 'it_reviewer',
    requiredFields: ['impactAnalysis', 'riskAssessment', 'implementationPlan', 'rolloutPlan', 'rollbackPlan'],
    sortOrder: 2,
    defaultNextStepId: 'step-approval',
    createdAt: new Date('2024-01-01'),
  };

  const mockApprovalStep = {
    id: 'step-approval',
    workflowDefinitionId: 'wf-def-001',
    name: 'Approval',
    stepType: 'approval',
    assignedRole: 'approver',
    requiredFields: null,
    sortOrder: 3,
    defaultNextStepId: 'step-implementation',
    createdAt: new Date('2024-01-01'),
  };

  const mockImplementationStep = {
    id: 'step-implementation',
    workflowDefinitionId: 'wf-def-001',
    name: 'Implementation',
    stepType: 'implementation',
    assignedRole: 'implementer',
    requiredFields: null,
    sortOrder: 4,
    defaultNextStepId: 'step-verification',
    createdAt: new Date('2024-01-01'),
  };

  const mockVerificationStep = {
    id: 'step-verification',
    workflowDefinitionId: 'wf-def-001',
    name: 'Verification',
    stepType: 'verification',
    assignedRole: 'it_reviewer',
    requiredFields: null,
    sortOrder: 5,
    defaultNextStepId: 'step-closed',
    createdAt: new Date('2024-01-01'),
  };

  const mockClosedStep = {
    id: 'step-closed',
    workflowDefinitionId: 'wf-def-001',
    name: 'Closed',
    stepType: 'end',
    assignedRole: 'system',
    requiredFields: null,
    sortOrder: 6,
    defaultNextStepId: null,
    createdAt: new Date('2024-01-01'),
  };

  // ─── CR Fixture Factory ─────────────────────────────────────────────────────

  function makeCr(
    step: typeof mockDraftStep,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      id: 'cr-001',
      crNumber: 'CR-2024-0001',
      requesterId: 'user-001',
      assignedToId: null,
      workflowInstanceId: 'wf-instance-001',
      changeType: 'normal',
      impactLevel: 'medium',
      affectedService: 'ERP System',
      description: 'Update database schema',
      justification: 'Performance improvement',
      requesterName: 'John Doe',
      requesterEmail: 'john.doe@dits.co.th',
      requesterDepartment: 'IT',
      approverRequestEmail: 'manager@dits.co.th',
      impactAnalysis: null,
      riskAssessment: null,
      implementationPlan: null,
      rolloutPlan: null,
      rollbackPlan: null,
      testResult: null,
      testAction: null,
      implementerNotes: null,
      versionBefore: null,
      versionAfter: null,
      downtimeStart: null,
      downtimeEnd: null,
      verificationResult: null,
      closureReason: null,
      emergencyReason: null,
      version: 1,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      workflowInstance: {
        id: 'wf-instance-001',
        status: 'active',
        currentStep: {
          name: step.name,
          stepType: step.stepType,
          assignedRole: step.assignedRole,
        },
      },
      ...overrides,
    };
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByCrNumber: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      generateNextCrNumber: jest.fn(),
    } as unknown as jest.Mocked<ChangeRequestRepository>;

    workflowEngine = {
      createInstance: jest.fn(),
      transition: jest.fn(),
      evaluateConditions: jest.fn(),
      getCurrentStep: jest.fn(),
      getInstanceStatus: jest.fn(),
    } as unknown as jest.Mocked<WorkflowEngineService>;

    workflowRepository = {
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

    auditService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEntity: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    approvalService = {
      hasApproval: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      postApprove: jest.fn(),
      getPendingApprovals: jest.fn(),
      getApprovalHistory: jest.fn(),
    } as unknown as jest.Mocked<ApprovalService>;

    service = new ChangeRequestService(
      repository,
      workflowEngine,
      workflowRepository,
      auditService,
      approvalService,
    );
  });

  // ─── submit ─────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('should move CR from Draft to Submitted', async () => {
      const crAtDraft = makeCr(mockDraftStep);
      const crAfterSubmit = makeCr(mockSubmittedStep);

      repository.findById
        .mockResolvedValueOnce(crAtDraft as any) // initial fetch
        .mockResolvedValueOnce(crAfterSubmit as any); // re-fetch after transition
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.submit('cr-001', 'user-001');

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        {},
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('submitted');
    });

    it('should throw when trying to submit from wrong step', async () => {
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(service.submit('cr-001', 'user-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent CR', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.submit('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── assign ─────────────────────────────────────────────────────────────────

  describe('assign', () => {
    it('should set assignedToId and move to IT Review', async () => {
      const crAtSubmitted = makeCr(mockSubmittedStep);
      const crAfterAssign = makeCr(mockReviewStep, { assignedToId: 'reviewer-001' });

      repository.findById
        .mockResolvedValueOnce(crAtSubmitted as any)
        .mockResolvedValueOnce(crAfterAssign as any);
      repository.update.mockResolvedValue(crAfterAssign as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.assign('cr-001', 'reviewer-001', 'cc-user-001');

      expect(repository.update).toHaveBeenCalledWith(
        'cr-001',
        { assignedToId: 'reviewer-001' },
        1,
      );
      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        {},
      );
      expect(result.assignedToId).toBe('reviewer-001');
    });

    it('should throw when CR is not at Submitted step', async () => {
      const crAtDraft = makeCr(mockDraftStep);
      repository.findById.mockResolvedValue(crAtDraft as any);

      await expect(
        service.assign('cr-001', 'reviewer-001', 'cc-user-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── submitForApproval ──────────────────────────────────────────────────────

  describe('submitForApproval', () => {
    it('should validate required fields and throw if missing', async () => {
      // CR at review step but missing required fields
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(
        service.submitForApproval('cr-001', 'reviewer-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition when all required fields are filled', async () => {
      const crAtReview = makeCr(mockReviewStep, {
        impactAnalysis: 'Low impact',
        riskAssessment: 'Minimal risk',
        implementationPlan: 'Step 1, Step 2',
        rolloutPlan: 'Deploy to staging first',
        rollbackPlan: 'Revert commit',
      });
      const crAfterApproval = makeCr(mockApprovalStep, {
        impactAnalysis: 'Low impact',
        riskAssessment: 'Minimal risk',
        implementationPlan: 'Step 1, Step 2',
        rolloutPlan: 'Deploy to staging first',
        rollbackPlan: 'Revert commit',
      });

      repository.findById
        .mockResolvedValueOnce(crAtReview as any)
        .mockResolvedValueOnce(crAfterApproval as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.submitForApproval('cr-001', 'reviewer-001');

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        { changeType: 'normal', impactLevel: 'medium' },
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('approval');
    });

    it('should route emergency CR to Implementation (skips approval)', async () => {
      const crEmergencyAtReview = makeCr(mockReviewStep, {
        changeType: 'emergency',
        emergencyReason: 'Critical production issue',
        impactAnalysis: 'High impact',
        riskAssessment: 'High risk but necessary',
        implementationPlan: 'Hotfix deployment',
        rolloutPlan: 'Direct production deploy',
        rollbackPlan: 'Revert to previous version',
      });
      // After transition, emergency goes to Implementation (skips Approval)
      const crAfterTransition = makeCr(mockImplementationStep, {
        changeType: 'emergency',
      });

      repository.findById
        .mockResolvedValueOnce(crEmergencyAtReview as any)
        .mockResolvedValueOnce(crAfterTransition as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.submitForApproval('cr-001', 'reviewer-001');

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        { changeType: 'emergency', impactLevel: 'medium' },
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('implementation');
    });
  });

  // ─── approve ────────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('should move CR from Approval to Implementation', async () => {
      const crAtApproval = makeCr(mockApprovalStep);
      const crAfterApprove = makeCr(mockImplementationStep);

      repository.findById
        .mockResolvedValueOnce(crAtApproval as any)
        .mockResolvedValueOnce(crAfterApprove as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.approve('cr-001', 'approver-001');

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        {},
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('implementation');
    });

    it('should throw when CR is not at Approval step', async () => {
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(
        service.approve('cr-001', 'approver-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── reject ─────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('should reject CR with reason and transition', async () => {
      const crAtApproval = makeCr(mockApprovalStep);
      const crAfterReject = makeCr(mockDraftStep, {
        closureReason: 'Insufficient justification',
      });

      repository.findById
        .mockResolvedValueOnce(crAtApproval as any)
        .mockResolvedValueOnce(crAfterReject as any);
      repository.update.mockResolvedValue(crAfterReject as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.reject(
        'cr-001',
        'approver-001',
        'Insufficient justification',
      );

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        { action: 'reject' },
      );
      expect(repository.update).toHaveBeenCalledWith(
        'cr-001',
        { closureReason: 'Insufficient justification' },
        1,
      );
    });

    it('should require a reason for rejection', async () => {
      const crAtApproval = makeCr(mockApprovalStep);
      repository.findById.mockResolvedValue(crAtApproval as any);

      await expect(
        service.reject('cr-001', 'approver-001', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when CR is not at Approval step', async () => {
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(
        service.reject('cr-001', 'approver-001', 'Some reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── implement ──────────────────────────────────────────────────────────────

  describe('implement', () => {
    it('should set implementation details and move to Verification', async () => {
      const crAtImpl = makeCr(mockImplementationStep);
      const crAfterImpl = makeCr(mockVerificationStep, {
        implementerNotes: 'Deployed successfully',
        versionBefore: 'v1.0.0',
        versionAfter: 'v1.1.0',
      });

      repository.findById
        .mockResolvedValueOnce(crAtImpl as any)
        .mockResolvedValueOnce(crAfterImpl as any);
      repository.update.mockResolvedValue(crAfterImpl as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.implement(
        'cr-001',
        'impl-001',
        'Deployed successfully',
        'v1.0.0',
        'v1.1.0',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'cr-001',
        {
          implementerNotes: 'Deployed successfully',
          versionBefore: 'v1.0.0',
          versionAfter: 'v1.1.0',
        },
        1,
      );
      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        {},
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('verification');
    });

    it('should throw when CR is not at Implementation step', async () => {
      const crAtApproval = makeCr(mockApprovalStep);
      repository.findById.mockResolvedValue(crAtApproval as any);

      await expect(
        service.implement('cr-001', 'impl-001', 'Notes'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── verify ─────────────────────────────────────────────────────────────────

  describe('verify', () => {
    it('should set verificationResult and transition on success', async () => {
      const crAtVerification = makeCr(mockVerificationStep);
      const crAfterVerify = makeCr(mockClosedStep, {
        verificationResult: 'success',
      });

      repository.findById
        .mockResolvedValueOnce(crAtVerification as any)
        .mockResolvedValueOnce(crAfterVerify as any);
      repository.update.mockResolvedValue(crAfterVerify as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.verify('cr-001', 'reviewer-001', 'success');

      expect(repository.update).toHaveBeenCalledWith(
        'cr-001',
        { verificationResult: 'success' },
        1,
      );
      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        { testResult: 'success' },
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('end');
    });

    it('should transition back to Implementation on failure', async () => {
      const crAtVerification = makeCr(mockVerificationStep);
      const crBackToImpl = makeCr(mockImplementationStep, {
        verificationResult: 'failed',
      });

      repository.findById
        .mockResolvedValueOnce(crAtVerification as any)
        .mockResolvedValueOnce(crBackToImpl as any);
      repository.update.mockResolvedValue(crBackToImpl as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.verify('cr-001', 'reviewer-001', 'failed');

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        { testResult: 'failed' },
      );
      expect(result.workflowInstance?.currentStep?.stepType).toBe('implementation');
    });
  });

  // ─── close ──────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('should close CR at end step', async () => {
      const crAtEnd = makeCr(mockClosedStep);
      const crClosed = makeCr(mockClosedStep, { closureReason: 'Completed' });

      repository.findById
        .mockResolvedValueOnce(crAtEnd as any)
        .mockResolvedValueOnce(crClosed as any);
      repository.update.mockResolvedValue(crClosed as any);

      const result = await service.close('cr-001', 'reviewer-001', 'Completed');

      expect(repository.update).toHaveBeenCalledWith(
        'cr-001',
        { closureReason: 'Completed' },
        1,
      );
      // Should NOT call transition since already at end step
      expect(workflowEngine.transition).not.toHaveBeenCalled();
    });

    it('should close CR at verification step by transitioning to end', async () => {
      const crAtVerification = makeCr(mockVerificationStep);
      const crClosed = makeCr(mockClosedStep);

      repository.findById
        .mockResolvedValueOnce(crAtVerification as any)
        .mockResolvedValueOnce(crClosed as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      const result = await service.close('cr-001', 'reviewer-001');

      expect(workflowEngine.transition).toHaveBeenCalledWith(
        'wf-instance-001',
        { testResult: 'success' },
      );
    });

    it('should throw when CR is not at end or verification step', async () => {
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(
        service.close('cr-001', 'reviewer-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Full Flow Test ─────────────────────────────────────────────────────────

  describe('full flow: submit → assign → submitForApproval → approve → implement → verify → close', () => {
    it('should complete entire normal CR workflow', async () => {
      // 1. Submit (Draft → Submitted)
      const crDraft = makeCr(mockDraftStep);
      const crSubmitted = makeCr(mockSubmittedStep);
      repository.findById
        .mockResolvedValueOnce(crDraft as any)
        .mockResolvedValueOnce(crSubmitted as any);
      workflowEngine.transition.mockResolvedValue({} as any);

      let result = await service.submit('cr-001', 'user-001');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('submitted');

      // 2. Assign (Submitted → IT Review)
      const crReview = makeCr(mockReviewStep, { assignedToId: 'reviewer-001' });
      repository.findById
        .mockResolvedValueOnce(crSubmitted as any)
        .mockResolvedValueOnce(crReview as any);
      repository.update.mockResolvedValue(crReview as any);

      result = await service.assign('cr-001', 'reviewer-001', 'cc-user-001');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('review');

      // 3. SubmitForApproval (IT Review → Approval)
      const crReviewFilled = makeCr(mockReviewStep, {
        assignedToId: 'reviewer-001',
        impactAnalysis: 'Low impact',
        riskAssessment: 'Low risk',
        implementationPlan: 'Step by step',
        rolloutPlan: 'Gradual rollout',
        rollbackPlan: 'Revert git commit',
      });
      const crApproval = makeCr(mockApprovalStep);
      repository.findById
        .mockResolvedValueOnce(crReviewFilled as any)
        .mockResolvedValueOnce(crApproval as any);

      result = await service.submitForApproval('cr-001', 'reviewer-001');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('approval');

      // 4. Approve (Approval → Implementation)
      const crImpl = makeCr(mockImplementationStep);
      repository.findById
        .mockResolvedValueOnce(crApproval as any)
        .mockResolvedValueOnce(crImpl as any);

      result = await service.approve('cr-001', 'approver-001');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('implementation');

      // 5. Implement (Implementation → Verification)
      const crVerification = makeCr(mockVerificationStep, {
        implementerNotes: 'Done',
        versionBefore: 'v1.0',
        versionAfter: 'v2.0',
      });
      repository.findById
        .mockResolvedValueOnce(crImpl as any)
        .mockResolvedValueOnce(crVerification as any);
      repository.update.mockResolvedValue(crVerification as any);

      result = await service.implement('cr-001', 'impl-001', 'Done', 'v1.0', 'v2.0');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('verification');

      // 6. Verify (Verification → Closed)
      const crEnd = makeCr(mockClosedStep, { verificationResult: 'success' });
      repository.findById
        .mockResolvedValueOnce(crVerification as any)
        .mockResolvedValueOnce(crEnd as any);
      repository.update.mockResolvedValue(crEnd as any);

      result = await service.verify('cr-001', 'reviewer-001', 'success');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('end');

      // 7. Close (End → remains End, sets closureReason)
      const crClosed = makeCr(mockClosedStep, {
        verificationResult: 'success',
        closureReason: 'Successfully completed',
      });
      repository.findById
        .mockResolvedValueOnce(crEnd as any)
        .mockResolvedValueOnce(crClosed as any);
      repository.update.mockResolvedValue(crClosed as any);

      result = await service.close('cr-001', 'reviewer-001', 'Successfully completed');
      expect(result.workflowInstance?.currentStep?.stepType).toBe('end');
    });
  });

  // ─── Wrong Step Errors ──────────────────────────────────────────────────────

  describe('step validation errors', () => {
    it('should throw when trying to submit from IT Review step', async () => {
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(service.submit('cr-001')).rejects.toThrow(
        /Cannot submit.*expected step type "start"/,
      );
    });

    it('should throw when trying to assign from Draft step', async () => {
      const crAtDraft = makeCr(mockDraftStep);
      repository.findById.mockResolvedValue(crAtDraft as any);

      await expect(
        service.assign('cr-001', 'reviewer-001', 'user-001'),
      ).rejects.toThrow(/Cannot assign.*expected step type "submitted"/);
    });

    it('should throw when trying to approve from Implementation step', async () => {
      const crAtImpl = makeCr(mockImplementationStep);
      repository.findById.mockResolvedValue(crAtImpl as any);

      await expect(
        service.approve('cr-001', 'approver-001'),
      ).rejects.toThrow(/Cannot approve.*expected step type "approval"/);
    });

    it('should throw when trying to implement from Approval step', async () => {
      const crAtApproval = makeCr(mockApprovalStep);
      repository.findById.mockResolvedValue(crAtApproval as any);

      await expect(
        service.implement('cr-001', 'impl-001', 'Notes'),
      ).rejects.toThrow(/Cannot implement.*expected step type "implementation"/);
    });

    it('should throw when trying to verify from IT Review step', async () => {
      const crAtReview = makeCr(mockReviewStep);
      repository.findById.mockResolvedValue(crAtReview as any);

      await expect(
        service.verify('cr-001', 'reviewer-001', 'success'),
      ).rejects.toThrow(/Cannot verify.*expected step type "verification"/);
    });
  });
});
