import { NotFoundException } from '@nestjs/common';
import { ChangeRequestService } from '../../../src/modules/change-request/change-request.service';
import { ChangeRequestRepository } from '../../../src/modules/change-request/change-request.repository';
import { WorkflowEngineService } from '../../../src/modules/workflow/workflow-engine.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { ApprovalService } from '../../../src/modules/approval/approval.service';
import { CRSearchQuery } from '../../../src/modules/change-request/dto/search-query.dto';

describe('ChangeRequestService - Search & History', () => {
  let service: ChangeRequestService;
  let repository: jest.Mocked<ChangeRequestRepository>;
  let workflowEngine: jest.Mocked<WorkflowEngineService>;
  let workflowRepository: jest.Mocked<WorkflowRepository>;
  let auditService: jest.Mocked<AuditService>;
  let approvalService: jest.Mocked<ApprovalService>;

  // ─── Fixtures ──────────────────────────────────────────────────────────────

  const mockCr1 = {
    id: 'cr-001',
    crNumber: 'CR-2024-0001',
    requesterId: 'user-001',
    assignedToId: 'reviewer-001',
    changeType: 'normal',
    impactLevel: 'medium',
    affectedService: 'ERP System',
    description: 'Update database schema for reporting',
    requesterName: 'John Doe',
    requesterEmail: 'john.doe@dits.co.th',
    requesterDepartment: 'IT',
    version: 1,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    workflowInstance: {
      status: 'active',
      currentStep: { name: 'IT Review', stepType: 'review', assignedRole: 'it_reviewer' },
    },
  };

  const mockCr2 = {
    id: 'cr-002',
    crNumber: 'CR-2024-0002',
    requesterId: 'user-002',
    assignedToId: null,
    changeType: 'emergency',
    impactLevel: 'high',
    affectedService: 'Firewall',
    description: 'Emergency firewall rule update',
    requesterName: 'Jane Smith',
    requesterEmail: 'jane.smith@dits.co.th',
    requesterDepartment: 'Security',
    version: 1,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    workflowInstance: {
      status: 'active',
      currentStep: { name: 'Start', stepType: 'start', assignedRole: 'system' },
    },
  };

  const mockAuditLogs = [
    {
      id: 'audit-001',
      userId: 'user-001',
      userEmail: 'john.doe@dits.co.th',
      action: 'CREATE',
      entityType: 'ChangeRequest',
      entityId: 'cr-001',
      oldValue: null,
      newValue: JSON.stringify({ changeType: 'normal', impactLevel: 'medium' }),
      ipAddress: '192.168.1.1',
      createdAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'audit-002',
      userId: 'reviewer-001',
      userEmail: 'reviewer@dits.co.th',
      action: 'UPDATE',
      entityType: 'ChangeRequest',
      entityId: 'cr-001',
      oldValue: JSON.stringify({ impactAnalysis: null }),
      newValue: JSON.stringify({ impactAnalysis: 'Low impact on services' }),
      ipAddress: '192.168.1.2',
      createdAt: new Date('2024-01-16T14:30:00Z'),
    },
  ];

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

  // ─── search ─────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('should return paginated results with filters applied', async () => {
      const paginatedResult = {
        data: [mockCr1 as any],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const query: CRSearchQuery = {
        changeType: 'normal',
        impactLevel: 'medium',
        assignedToId: 'reviewer-001',
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await service.search(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockCr1);
      expect(result.meta.total).toBe(1);
      expect(repository.findAll).toHaveBeenCalledWith(
        {
          changeType: 'normal',
          impactLevel: 'medium',
          assignedToId: 'reviewer-001',
        },
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
    });

    it('should return all results when no filters are provided', async () => {
      const paginatedResult = {
        data: [mockCr1 as any, mockCr2 as any],
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const query: CRSearchQuery = {
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await service.search(query);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(repository.findAll).toHaveBeenCalledWith(
        {},
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
    });

    it('should apply date range filters correctly', async () => {
      const paginatedResult = {
        data: [mockCr1 as any],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const query: CRSearchQuery = {
        createdFrom: '2024-01-01',
        createdTo: '2024-01-31',
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await service.search(query);

      expect(result.data).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalledWith(
        {
          createdFrom: new Date('2024-01-01'),
          createdTo: new Date('2024-01-31'),
        },
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
    });

    it('should apply full-text search filter', async () => {
      const paginatedResult = {
        data: [mockCr1 as any],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const query: CRSearchQuery = {
        search: 'database',
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await service.search(query);

      expect(result.data).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalledWith(
        { search: 'database' },
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
    });

    it('should handle pagination params correctly (page, pageSize, sortBy, sortOrder)', async () => {
      const paginatedResult = {
        data: [mockCr2 as any],
        meta: { total: 50, page: 3, limit: 10, totalPages: 5 },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const query: CRSearchQuery = {
        page: 3,
        pageSize: 10,
        sortBy: 'crNumber',
        sortOrder: 'asc',
      };

      const result = await service.search(query);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(repository.findAll).toHaveBeenCalledWith(
        {},
        { page: 3, pageSize: 10, sortBy: 'crNumber', sortOrder: 'asc' },
      );
    });

    it('should combine multiple filters with requesterEmail', async () => {
      const paginatedResult = {
        data: [mockCr2 as any],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      repository.findAll.mockResolvedValue(paginatedResult);

      const query: CRSearchQuery = {
        changeType: 'emergency',
        requesterEmail: 'jane.smith@dits.co.th',
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await service.search(query);

      expect(result.data).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalledWith(
        {
          changeType: 'emergency',
          requesterEmail: 'jane.smith@dits.co.th',
        },
        { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
    });
  });

  // ─── getHistory ─────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('should return audit entries for a CR', async () => {
      repository.findById.mockResolvedValue(mockCr1 as any);
      auditService.findByEntity.mockResolvedValue(mockAuditLogs as any);

      const result = await service.getHistory('cr-001');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('CREATE');
      expect(result[1].action).toBe('UPDATE');
      expect(auditService.findByEntity).toHaveBeenCalledWith('ChangeRequest', 'cr-001');
    });

    it('should return empty array for CR with no history', async () => {
      repository.findById.mockResolvedValue(mockCr2 as any);
      auditService.findByEntity.mockResolvedValue([]);

      const result = await service.getHistory('cr-002');

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
      expect(auditService.findByEntity).toHaveBeenCalledWith('ChangeRequest', 'cr-002');
    });

    it('should throw NotFoundException for non-existent CR', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getHistory('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(auditService.findByEntity).not.toHaveBeenCalled();
    });
  });
});
