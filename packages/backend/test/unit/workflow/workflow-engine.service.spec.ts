import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowEngineService, TransitionContext } from '../../../src/modules/workflow/workflow-engine.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let repository: jest.Mocked<WorkflowRepository>;

  // ─── Fixtures ──────────────────────────────────────────────────────────────

  const mockStartStep = {
    id: 'step-start',
    workflowDefinitionId: 'wf-def-001',
    name: 'Start',
    stepType: 'start',
    assignedRole: 'system',
    requiredFields: null,
    sortOrder: 0,
    defaultNextStepId: 'step-review',
    createdAt: new Date('2024-01-01'),
  };

  const mockReviewStep = {
    id: 'step-review',
    workflowDefinitionId: 'wf-def-001',
    name: 'IT Review',
    stepType: 'review',
    assignedRole: 'it_reviewer',
    requiredFields: null,
    sortOrder: 1,
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
    sortOrder: 2,
    defaultNextStepId: 'step-impl',
    createdAt: new Date('2024-01-01'),
  };

  const mockImplStep = {
    id: 'step-impl',
    workflowDefinitionId: 'wf-def-001',
    name: 'Implementation',
    stepType: 'implementation',
    assignedRole: 'implementer',
    requiredFields: null,
    sortOrder: 3,
    defaultNextStepId: 'step-end',
    createdAt: new Date('2024-01-01'),
  };

  const mockEndStep = {
    id: 'step-end',
    workflowDefinitionId: 'wf-def-001',
    name: 'End',
    stepType: 'end',
    assignedRole: 'system',
    requiredFields: null,
    sortOrder: 4,
    defaultNextStepId: null,
    createdAt: new Date('2024-01-01'),
  };

  const mockDefinition = {
    id: 'wf-def-001',
    name: 'Standard CR Workflow',
    versionNumber: 3,
    isActive: true,
    isDefault: true,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    createdById: 'user-001',
    steps: [mockStartStep, mockReviewStep, mockApprovalStep, mockImplStep, mockEndStep],
    conditions: [],
  };

  const mockInstance = {
    id: 'instance-001',
    workflowDefinitionId: 'wf-def-001',
    changeRequestId: 'cr-001',
    currentStepId: 'step-review',
    status: 'active',
    workflowVersion: 3,
    startedAt: new Date('2024-01-15'),
    completedAt: null,
    currentStep: mockReviewStep,
  };

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeEach(() => {
    repository = {
      findDefinitionById: jest.fn(),
      findActiveDefault: jest.fn(),
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

    service = new WorkflowEngineService(repository);
  });

  // ─── createInstance ─────────────────────────────────────────────────────────

  describe('createInstance', () => {
    it('should create instance with start step and active status', async () => {
      repository.findDefinitionById.mockResolvedValue(mockDefinition);
      repository.createInstance.mockResolvedValue({
        id: 'instance-new',
        workflowDefinitionId: 'wf-def-001',
        changeRequestId: 'cr-001',
        currentStepId: 'step-start',
        status: 'active',
        workflowVersion: 3,
        startedAt: new Date(),
        completedAt: null,
      });
      repository.findInstanceById.mockResolvedValue({
        id: 'instance-new',
        workflowDefinitionId: 'wf-def-001',
        changeRequestId: 'cr-001',
        currentStepId: 'step-start',
        status: 'active',
        workflowVersion: 3,
        startedAt: new Date(),
        completedAt: null,
        currentStep: mockStartStep,
      });

      const result = await service.createInstance('wf-def-001', 'cr-001');

      expect(result.status).toBe('active');
      expect(result.currentStep.stepType).toBe('start');
      expect(result.currentStepId).toBe('step-start');
      expect(repository.createInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowDefinition: { connect: { id: 'wf-def-001' } },
          currentStep: { connect: { id: 'step-start' } },
          changeRequest: { connect: { id: 'cr-001' } },
          status: 'active',
        }),
      );
    });

    it('should lock workflow version at creation time', async () => {
      repository.findDefinitionById.mockResolvedValue(mockDefinition);
      repository.createInstance.mockResolvedValue({
        id: 'instance-new',
        workflowDefinitionId: 'wf-def-001',
        changeRequestId: 'cr-002',
        currentStepId: 'step-start',
        status: 'active',
        workflowVersion: 3,
        startedAt: new Date(),
        completedAt: null,
      });
      repository.findInstanceById.mockResolvedValue({
        id: 'instance-new',
        workflowDefinitionId: 'wf-def-001',
        changeRequestId: 'cr-002',
        currentStepId: 'step-start',
        status: 'active',
        workflowVersion: 3,
        startedAt: new Date(),
        completedAt: null,
        currentStep: mockStartStep,
      });

      const result = await service.createInstance('wf-def-001', 'cr-002');

      expect(result.workflowVersion).toBe(3);
      expect(repository.createInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowVersion: 3,
        }),
      );
    });

    it('should throw NotFoundException if definition does not exist', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(
        service.createInstance('non-existent', 'cr-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if definition has no start step', async () => {
      const defWithoutStart = {
        ...mockDefinition,
        steps: [mockReviewStep, mockApprovalStep],
      };
      repository.findDefinitionById.mockResolvedValue(defWithoutStart);

      await expect(
        service.createInstance('wf-def-001', 'cr-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── transition ─────────────────────────────────────────────────────────────

  describe('transition', () => {
    it('should move to next step using defaultNextStepId', async () => {
      repository.findInstanceById
        .mockResolvedValueOnce(mockInstance) // First call: get current instance
        .mockResolvedValueOnce({
          ...mockInstance,
          currentStepId: 'step-approval',
          currentStep: mockApprovalStep,
        }); // Second call: return updated instance
      repository.findConditionsByFromStepId.mockResolvedValue([]);
      repository.findStepById.mockResolvedValue({
        ...mockApprovalStep,
        defaultNextStep: null,
        conditionsFrom: [],
      });
      repository.updateInstance.mockResolvedValue({
        ...mockInstance,
        currentStepId: 'step-approval',
      });

      const result = await service.transition('instance-001', {});

      expect(result.currentStepId).toBe('step-approval');
      expect(repository.updateInstance).toHaveBeenCalledWith(
        'instance-001',
        expect.objectContaining({
          currentStep: { connect: { id: 'step-approval' } },
        }),
      );
    });

    it('should use condition routing when conditions match', async () => {
      // Condition: if changeType=emergency, go directly to implementation
      const emergencyCondition = {
        id: 'cond-001',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-impl',
        fieldName: 'changeType',
        operator: 'equals',
        value: 'emergency',
        priority: 10,
      };

      repository.findInstanceById
        .mockResolvedValueOnce(mockInstance)
        .mockResolvedValueOnce({
          ...mockInstance,
          currentStepId: 'step-impl',
          currentStep: mockImplStep,
        });
      repository.findConditionsByFromStepId.mockResolvedValue([emergencyCondition]);
      repository.findStepById.mockResolvedValue({
        ...mockImplStep,
        defaultNextStep: null,
        conditionsFrom: [],
      });
      repository.updateInstance.mockResolvedValue({
        ...mockInstance,
        currentStepId: 'step-impl',
      });

      const context: TransitionContext = { changeType: 'emergency' };
      const result = await service.transition('instance-001', context);

      expect(result.currentStepId).toBe('step-impl');
    });

    it('should throw NotFoundException for invalid instance', async () => {
      repository.findInstanceById.mockResolvedValue(null);

      await expect(
        service.transition('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for completed instance', async () => {
      const completedInstance = {
        ...mockInstance,
        status: 'completed',
        completedAt: new Date(),
      };
      repository.findInstanceById.mockResolvedValue(completedInstance);

      await expect(
        service.transition('instance-001', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set status=completed when reaching end step', async () => {
      const instanceAtImpl = {
        ...mockInstance,
        currentStepId: 'step-impl',
        currentStep: mockImplStep,
      };

      repository.findInstanceById
        .mockResolvedValueOnce(instanceAtImpl)
        .mockResolvedValueOnce({
          ...instanceAtImpl,
          currentStepId: 'step-end',
          currentStep: mockEndStep,
          status: 'completed',
          completedAt: new Date(),
        });
      repository.findConditionsByFromStepId.mockResolvedValue([]);
      repository.findStepById.mockResolvedValue({
        ...mockEndStep,
        defaultNextStep: null,
        conditionsFrom: [],
      });
      repository.updateInstance.mockResolvedValue({
        ...instanceAtImpl,
        currentStepId: 'step-end',
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.transition('instance-001', {});

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(repository.updateInstance).toHaveBeenCalledWith(
        'instance-001',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException when no valid next step exists', async () => {
      const instanceAtEnd = {
        ...mockInstance,
        currentStepId: 'step-end',
        currentStep: { ...mockEndStep, defaultNextStepId: null },
      };

      repository.findInstanceById.mockResolvedValue(instanceAtEnd);
      repository.findConditionsByFromStepId.mockResolvedValue([]);

      await expect(
        service.transition('instance-001', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── evaluateConditions ─────────────────────────────────────────────────────

  describe('evaluateConditions', () => {
    it('should return first matching condition by priority', async () => {
      const conditions = [
        {
          id: 'cond-high',
          workflowDefinitionId: 'wf-def-001',
          fromStepId: 'step-review',
          toStepId: 'step-impl',
          fieldName: 'changeType',
          operator: 'equals',
          value: 'emergency',
          priority: 10,
        },
        {
          id: 'cond-low',
          workflowDefinitionId: 'wf-def-001',
          fromStepId: 'step-review',
          toStepId: 'step-approval',
          fieldName: 'changeType',
          operator: 'equals',
          value: 'emergency',
          priority: 5,
        },
      ];

      repository.findConditionsByFromStepId.mockResolvedValue(conditions);

      const result = await service.evaluateConditions(mockReviewStep, {
        changeType: 'emergency',
      });

      // Should return the first matching (highest priority) condition's toStepId
      expect(result).toBe('step-impl');
    });

    it('should fall back to defaultNextStepId when no conditions match', async () => {
      const conditions = [
        {
          id: 'cond-001',
          workflowDefinitionId: 'wf-def-001',
          fromStepId: 'step-review',
          toStepId: 'step-impl',
          fieldName: 'changeType',
          operator: 'equals',
          value: 'emergency',
          priority: 10,
        },
      ];

      repository.findConditionsByFromStepId.mockResolvedValue(conditions);

      const result = await service.evaluateConditions(mockReviewStep, {
        changeType: 'normal',
      });

      // No condition matches, falls back to defaultNextStepId
      expect(result).toBe('step-approval');
    });

    it('should return defaultNextStepId when there are no conditions', async () => {
      repository.findConditionsByFromStepId.mockResolvedValue([]);

      const result = await service.evaluateConditions(mockReviewStep, {});

      expect(result).toBe('step-approval');
    });

    it('should return null when no conditions match and no defaultNextStepId', async () => {
      repository.findConditionsByFromStepId.mockResolvedValue([]);

      const stepWithNoDefault = { ...mockEndStep, defaultNextStepId: null };
      const result = await service.evaluateConditions(stepWithNoDefault, {});

      expect(result).toBeNull();
    });
  });

  // ─── evaluateCondition (single condition) ───────────────────────────────────

  describe('evaluateCondition', () => {
    it('should evaluate equals operator correctly', () => {
      const condition = {
        id: 'cond-001',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-impl',
        fieldName: 'changeType',
        operator: 'equals',
        value: 'emergency',
        priority: 10,
      };

      expect(
        service.evaluateCondition(condition, { changeType: 'emergency' }),
      ).toBe(true);
      expect(
        service.evaluateCondition(condition, { changeType: 'normal' }),
      ).toBe(false);
    });

    it('should evaluate not_equals operator correctly', () => {
      const condition = {
        id: 'cond-002',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-approval',
        fieldName: 'impactLevel',
        operator: 'not_equals',
        value: 'low',
        priority: 5,
      };

      expect(
        service.evaluateCondition(condition, { impactLevel: 'high' }),
      ).toBe(true);
      expect(
        service.evaluateCondition(condition, { impactLevel: 'low' }),
      ).toBe(false);
    });

    it('should evaluate in operator correctly', () => {
      const condition = {
        id: 'cond-003',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-approval',
        fieldName: 'impactLevel',
        operator: 'in',
        value: 'major, high, medium',
        priority: 5,
      };

      expect(
        service.evaluateCondition(condition, { impactLevel: 'high' }),
      ).toBe(true);
      expect(
        service.evaluateCondition(condition, { impactLevel: 'major' }),
      ).toBe(true);
      expect(
        service.evaluateCondition(condition, { impactLevel: 'low' }),
      ).toBe(false);
    });

    it('should evaluate greater_than operator correctly', () => {
      const condition = {
        id: 'cond-004',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-approval',
        fieldName: 'riskScore',
        operator: 'greater_than',
        value: '5',
        priority: 5,
      };

      expect(
        service.evaluateCondition(condition, { riskScore: 8 }),
      ).toBe(true);
      expect(
        service.evaluateCondition(condition, { riskScore: 5 }),
      ).toBe(false);
      expect(
        service.evaluateCondition(condition, { riskScore: 3 }),
      ).toBe(false);
    });

    it('should return false for greater_than with non-numeric values', () => {
      const condition = {
        id: 'cond-005',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-approval',
        fieldName: 'riskScore',
        operator: 'greater_than',
        value: '5',
        priority: 5,
      };

      expect(
        service.evaluateCondition(condition, { riskScore: 'abc' }),
      ).toBe(false);
    });
  });

  // ─── Emergency Change Routing ───────────────────────────────────────────────

  describe('emergency change skips approval (condition routing)', () => {
    it('should route emergency change directly to implementation step', async () => {
      // Setup: condition says emergency changes skip approval
      const emergencyCondition = {
        id: 'cond-emergency',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-impl',
        fieldName: 'changeType',
        operator: 'equals',
        value: 'emergency',
        priority: 100,
      };

      const normalCondition = {
        id: 'cond-normal',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-review',
        toStepId: 'step-approval',
        fieldName: 'changeType',
        operator: 'equals',
        value: 'normal',
        priority: 50,
      };

      repository.findInstanceById
        .mockResolvedValueOnce(mockInstance) // Instance at review step
        .mockResolvedValueOnce({
          ...mockInstance,
          currentStepId: 'step-impl',
          currentStep: mockImplStep,
        });
      repository.findConditionsByFromStepId.mockResolvedValue([
        emergencyCondition,
        normalCondition,
      ]);
      repository.findStepById.mockResolvedValue({
        ...mockImplStep,
        defaultNextStep: null,
        conditionsFrom: [],
      });
      repository.updateInstance.mockResolvedValue({
        ...mockInstance,
        currentStepId: 'step-impl',
      });

      const context: TransitionContext = { changeType: 'emergency' };
      const result = await service.transition('instance-001', context);

      // Emergency change should go directly to implementation, skipping approval
      expect(result.currentStep.name).toBe('Implementation');
      expect(result.currentStepId).toBe('step-impl');
    });
  });

  // ─── getCurrentStep & getInstanceStatus ─────────────────────────────────────

  describe('getCurrentStep', () => {
    it('should return current step of the instance', async () => {
      repository.findInstanceById.mockResolvedValue(mockInstance);

      const step = await service.getCurrentStep('instance-001');

      expect(step.id).toBe('step-review');
      expect(step.name).toBe('IT Review');
    });

    it('should throw NotFoundException for non-existent instance', async () => {
      repository.findInstanceById.mockResolvedValue(null);

      await expect(
        service.getCurrentStep('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInstanceStatus', () => {
    it('should return instance with current step info', async () => {
      repository.findInstanceById.mockResolvedValue(mockInstance);

      const result = await service.getInstanceStatus('instance-001');

      expect(result.id).toBe('instance-001');
      expect(result.status).toBe('active');
      expect(result.currentStep.name).toBe('IT Review');
    });

    it('should throw NotFoundException for non-existent instance', async () => {
      repository.findInstanceById.mockResolvedValue(null);

      await expect(
        service.getInstanceStatus('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
