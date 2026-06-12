import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  ChangeRequestService,
  FieldValidationResult,
} from '../../../src/modules/change-request/change-request.service';
import { ChangeRequestRepository } from '../../../src/modules/change-request/change-request.repository';
import { WorkflowEngineService } from '../../../src/modules/workflow/workflow-engine.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { ApprovalService } from '../../../src/modules/approval/approval.service';
import { CreateChangeRequestDto } from '../../../src/modules/change-request/dto/create-change-request.dto';
import { UpdateChangeRequestDto } from '../../../src/modules/change-request/dto/update-change-request.dto';

describe('ChangeRequestService', () => {
  let service: ChangeRequestService;
  let repository: jest.Mocked<ChangeRequestRepository>;
  let workflowEngine: jest.Mocked<WorkflowEngineService>;
  let workflowRepository: jest.Mocked<WorkflowRepository>;
  let auditService: jest.Mocked<AuditService>;
  let approvalService: jest.Mocked<ApprovalService>;

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
    requiredFields: ['impactAnalysis', 'riskAssessment', 'implementationPlan', 'rolloutPlan', 'rollbackPlan'],
    sortOrder: 1,
    defaultNextStepId: 'step-approval',
    createdAt: new Date('2024-01-01'),
  };

  const mockDefaultWorkflow = {
    id: 'wf-def-001',
    name: 'Standard CR Workflow',
    versionNumber: 1,
    isActive: true,
    isDefault: true,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    createdById: 'admin-user-001',
    steps: [mockStartStep, mockReviewStep],
    conditions: [],
  };

  const mockWorkflowInstance = {
    id: 'wf-instance-001',
    workflowDefinitionId: 'wf-def-001',
    changeRequestId: 'cr-001',
    currentStepId: 'step-start',
    status: 'active',
    workflowVersion: 1,
    startedAt: new Date('2024-01-15'),
    completedAt: null,
    currentStep: mockStartStep,
  };

  const mockCrWithWorkflow = {
    id: 'cr-001',
    crNumber: 'CR-2024-0001',
    requesterId: 'user-001',
    assignedToId: null,
    changeType: 'normal',
    impactLevel: 'medium',
    affectedService: 'ERP System',
    description: 'Update database schema for reporting',
    justification: 'Improve reporting performance',
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
      status: 'active',
      currentStep: {
        name: 'Start',
        stepType: 'start',
        assignedRole: 'system',
      },
    },
  };

  const createDto: CreateChangeRequestDto = {
    changeType: 'normal',
    impactLevel: 'medium',
    affectedService: 'ERP System',
    description: 'Update database schema for reporting',
    justification: 'Improve reporting performance',
    requesterName: 'John Doe',
    requesterEmail: 'john.doe@dits.co.th',
    requesterDepartment: 'IT',
    approverRequestEmail: 'manager@dits.co.th',
  };

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

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create CR with auto-generated crNumber and workflow instance', async () => {
      workflowRepository.findActiveDefault.mockResolvedValue(mockDefaultWorkflow);
      repository.create.mockResolvedValue(mockCrWithWorkflow as any);
      workflowEngine.createInstance.mockResolvedValue(mockWorkflowInstance);
      repository.findById.mockResolvedValue(mockCrWithWorkflow as any);

      const result = await service.create(createDto, 'user-001');

      expect(result.crNumber).toBe('CR-2024-0001');
      expect(result.workflowInstance).toBeDefined();
      expect(result.workflowInstance?.status).toBe('active');
      expect(workflowEngine.createInstance).toHaveBeenCalledWith(
        'wf-def-001',
        'cr-001',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeType: 'normal',
          impactLevel: 'medium',
          affectedService: 'ERP System',
          description: 'Update database schema for reporting',
          requesterName: 'John Doe',
          requesterEmail: 'john.doe@dits.co.th',
          requester: { connect: { id: 'user-001' } },
        }),
      );
    });

    it('should create CR for anonymous (no userId)', async () => {
      workflowRepository.findActiveDefault.mockResolvedValue(mockDefaultWorkflow);
      const anonymousCr = {
        ...mockCrWithWorkflow,
        requesterId: null,
      };
      repository.create.mockResolvedValue(anonymousCr as any);
      workflowEngine.createInstance.mockResolvedValue(mockWorkflowInstance);
      repository.findById.mockResolvedValue(anonymousCr as any);

      const result = await service.create(createDto); // no userId

      expect(result.requesterId).toBeNull();
      expect(result.crNumber).toBe('CR-2024-0001');
      expect(repository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          requester: expect.anything(),
        }),
      );
    });

    it('should throw BadRequestException when no active default workflow exists', async () => {
      workflowRepository.findActiveDefault.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return CR with workflow status', async () => {
      repository.findById.mockResolvedValue(mockCrWithWorkflow as any);

      const result = await service.findById('cr-001');

      expect(result.id).toBe('cr-001');
      expect(result.crNumber).toBe('CR-2024-0001');
      expect(result.workflowInstance?.status).toBe('active');
      expect(result.workflowInstance?.currentStep?.name).toBe('Start');
    });

    it('should throw NotFoundException for non-existent CR', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findByCrNumber ─────────────────────────────────────────────────────────

  describe('findByCrNumber', () => {
    it('should return CR found by CR number', async () => {
      repository.findByCrNumber.mockResolvedValue(mockCrWithWorkflow as any);

      const result = await service.findByCrNumber('CR-2024-0001');

      expect(result.id).toBe('cr-001');
      expect(result.crNumber).toBe('CR-2024-0001');
    });

    it('should throw NotFoundException for non-existent CR number', async () => {
      repository.findByCrNumber.mockResolvedValue(null);

      await expect(
        service.findByCrNumber('CR-2024-9999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const paginatedResult = {
        data: [mockCrWithWorkflow as any],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(
        { changeType: 'normal' },
        { page: 1, pageSize: 20 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(repository.findAll).toHaveBeenCalledWith(
        { changeType: 'normal' },
        { page: 1, pageSize: 20 },
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update CR with valid version (optimistic locking success)', async () => {
      const crAtStartStep = {
        ...mockCrWithWorkflow,
        workflowInstance: {
          status: 'active',
          currentStep: mockStartStep, // requiredFields is null → all allowed
        },
      };
      repository.findById.mockResolvedValue(crAtStartStep as any);

      const updatedCr = {
        ...mockCrWithWorkflow,
        description: 'Updated description',
        version: 2,
      };
      repository.update.mockResolvedValue(updatedCr as any);

      const updateDto: UpdateChangeRequestDto = {
        description: 'Updated description',
        version: 1,
      };

      const result = await service.update('cr-001', updateDto, 'user-001');

      expect(result.description).toBe('Updated description');
      expect(result.version).toBe(2);
      expect(repository.update).toHaveBeenCalledWith(
        'cr-001',
        { description: 'Updated description' },
        1, // expected version for optimistic locking
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      const crAtStartStep = {
        ...mockCrWithWorkflow,
        version: 3, // current version is 3
        workflowInstance: {
          status: 'active',
          currentStep: mockStartStep,
        },
      };
      repository.findById.mockResolvedValue(crAtStartStep as any);
      repository.update.mockRejectedValue(
        new ConflictException(
          'Change request has been modified by another user. Please refresh and try again.',
        ),
      );

      const updateDto: UpdateChangeRequestDto = {
        description: 'Updated description',
        version: 1, // stale version
      };

      await expect(
        service.update('cr-001', updateDto, 'user-001'),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate allowed fields for current workflow step', async () => {
      // CR is at IT Review step which only allows review-related fields
      const crAtReviewStep = {
        ...mockCrWithWorkflow,
        workflowInstance: {
          status: 'active',
          currentStep: mockReviewStep, // requiredFields: ['impactAnalysis', 'riskAssessment', ...]
        },
      };
      repository.findById.mockResolvedValue(crAtReviewStep as any);

      // Trying to update fields that are NOT allowed at review step
      const updateDto: UpdateChangeRequestDto = {
        changeType: 'emergency', // not allowed at review step
        version: 1,
      };

      await expect(
        service.update('cr-001', updateDto, 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow updating fields that are in requiredFields for current step', async () => {
      const crAtReviewStep = {
        ...mockCrWithWorkflow,
        workflowInstance: {
          status: 'active',
          currentStep: mockReviewStep,
        },
      };
      repository.findById.mockResolvedValue(crAtReviewStep as any);

      const updatedCr = {
        ...mockCrWithWorkflow,
        impactAnalysis: 'Low impact on existing services',
        version: 2,
      };
      repository.update.mockResolvedValue(updatedCr as any);

      const updateDto: UpdateChangeRequestDto = {
        impactAnalysis: 'Low impact on existing services',
        version: 1,
      };

      const result = await service.update('cr-001', updateDto, 'user-001');

      expect(result.impactAnalysis).toBe('Low impact on existing services');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent CR', async () => {
      repository.findById.mockResolvedValue(null);

      const updateDto: UpdateChangeRequestDto = {
        description: 'Updated',
        version: 1,
      };

      await expect(
        service.update('non-existent', updateDto, 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── validateFieldsForStep ──────────────────────────────────────────────────

  describe('validateFieldsForStep', () => {
    it('should allow all fields when step has no requiredFields config', () => {
      const result = service.validateFieldsForStep(
        ['changeType', 'description', 'impactLevel'],
        mockStartStep as any,
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow fields that are in requiredFields', () => {
      const result = service.validateFieldsForStep(
        ['impactAnalysis', 'riskAssessment'],
        mockReviewStep as any,
      );

      expect(result.allowed).toBe(true);
    });

    it('should reject fields not in requiredFields', () => {
      const result = service.validateFieldsForStep(
        ['changeType', 'impactAnalysis'],
        mockReviewStep as any,
      );

      expect(result.allowed).toBe(false);
      expect(result.disallowedFields).toContain('changeType');
      expect(result.reason).toContain('changeType');
      expect(result.reason).toContain('IT Review');
    });

    it('should return all disallowed fields in the result', () => {
      const result = service.validateFieldsForStep(
        ['changeType', 'description', 'impactAnalysis'],
        mockReviewStep as any,
      );

      expect(result.allowed).toBe(false);
      expect(result.disallowedFields).toEqual(
        expect.arrayContaining(['changeType', 'description']),
      );
      expect(result.disallowedFields).not.toContain('impactAnalysis');
    });
  });
});
