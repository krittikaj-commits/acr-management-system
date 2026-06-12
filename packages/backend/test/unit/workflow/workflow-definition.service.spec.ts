import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowDefinitionService } from '../../../src/modules/workflow/workflow-definition.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';

describe('WorkflowDefinitionService', () => {
  let service: WorkflowDefinitionService;
  let repository: jest.Mocked<WorkflowRepository>;

  const mockUserId = 'user-uuid-001';

  const mockDefinition = {
    id: 'wf-def-001',
    name: 'Standard CR Workflow',
    versionNumber: 1,
    isActive: true,
    isDefault: true,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    createdById: mockUserId,
    steps: [
      {
        id: 'step-001',
        workflowDefinitionId: 'wf-def-001',
        name: 'IT Review',
        stepType: 'review',
        assignedRole: 'it_reviewer',
        requiredFields: null,
        sortOrder: 1,
        defaultNextStepId: null,
        createdAt: new Date('2024-01-01'),
      },
    ],
    conditions: [
      {
        id: 'cond-001',
        workflowDefinitionId: 'wf-def-001',
        fromStepId: 'step-001',
        toStepId: 'step-002',
        fieldName: 'impactLevel',
        operator: 'equals',
        value: 'major',
        priority: 1,
      },
    ],
  };

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
    } as unknown as jest.Mocked<WorkflowRepository>;

    service = new WorkflowDefinitionService(repository);
  });

  describe('create', () => {
    it('should create a workflow definition with version 1', async () => {
      const dto = { name: 'New Workflow' };
      const createdDef = {
        id: 'wf-def-new',
        name: 'New Workflow',
        versionNumber: 1,
        isActive: true,
        isDefault: false,
        metadata: null,
        createdAt: new Date(),
        createdById: mockUserId,
      };

      repository.createDefinition.mockResolvedValue(createdDef);

      const result = await service.create(dto, mockUserId);

      expect(result.versionNumber).toBe(1);
      expect(result.isActive).toBe(true);
      expect(result.name).toBe('New Workflow');
      expect(repository.createDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Workflow',
          versionNumber: 1,
          isActive: true,
          isDefault: false,
          createdBy: { connect: { id: mockUserId } },
        }),
      );
    });

    it('should unmark other defaults if isDefault is true', async () => {
      const dto = { name: 'Default Workflow', isDefault: true };
      const currentDefault = { ...mockDefinition };

      repository.findActiveDefault.mockResolvedValue(currentDefault);
      repository.updateDefinition.mockResolvedValue({
        ...currentDefault,
        isDefault: false,
      });
      repository.createDefinition.mockResolvedValue({
        id: 'wf-def-new',
        name: 'Default Workflow',
        versionNumber: 1,
        isActive: true,
        isDefault: true,
        metadata: null,
        createdAt: new Date(),
        createdById: mockUserId,
      });

      await service.create(dto, mockUserId);

      expect(repository.updateDefinition).toHaveBeenCalledWith(
        currentDefault.id,
        { isDefault: false },
      );
    });
  });

  describe('update', () => {
    it('should create a new version with incremented versionNumber', async () => {
      const dto = { name: 'Updated Workflow' };
      const newDef = {
        id: 'wf-def-002',
        name: 'Updated Workflow',
        versionNumber: 2,
        isActive: true,
        isDefault: true,
        metadata: null,
        createdAt: new Date(),
        createdById: mockUserId,
      };

      repository.findDefinitionById
        .mockResolvedValueOnce(mockDefinition) // First call: get existing
        .mockResolvedValueOnce({ ...mockDefinition, ...newDef, steps: [], conditions: [] }); // Second call: return new with relations
      repository.updateDefinition.mockResolvedValue({
        ...mockDefinition,
        isActive: false,
      });
      repository.createDefinition.mockResolvedValue(newDef);
      repository.createStep.mockResolvedValue(mockDefinition.steps[0]);
      repository.createCondition.mockResolvedValue(mockDefinition.conditions[0]);

      const result = await service.update('wf-def-001', dto);

      expect(result.versionNumber).toBe(2);
      expect(repository.createDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 2,
          name: 'Updated Workflow',
        }),
      );
    });

    it('should deactivate old version on update', async () => {
      const dto = { name: 'Updated Workflow' };
      const newDef = {
        id: 'wf-def-002',
        name: 'Updated Workflow',
        versionNumber: 2,
        isActive: true,
        isDefault: true,
        metadata: null,
        createdAt: new Date(),
        createdById: mockUserId,
      };

      repository.findDefinitionById
        .mockResolvedValueOnce(mockDefinition)
        .mockResolvedValueOnce({ ...newDef, steps: [], conditions: [] });
      repository.updateDefinition.mockResolvedValue({
        ...mockDefinition,
        isActive: false,
      });
      repository.createDefinition.mockResolvedValue(newDef);
      repository.createStep.mockResolvedValue(mockDefinition.steps[0]);
      repository.createCondition.mockResolvedValue(mockDefinition.conditions[0]);

      await service.update('wf-def-001', dto);

      expect(repository.updateDefinition).toHaveBeenCalledWith('wf-def-001', {
        isActive: false,
      });
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should copy steps and conditions to the new version', async () => {
      const dto = { name: 'Updated Workflow' };
      const newDef = {
        id: 'wf-def-002',
        name: 'Updated Workflow',
        versionNumber: 2,
        isActive: true,
        isDefault: true,
        metadata: null,
        createdAt: new Date(),
        createdById: mockUserId,
      };

      repository.findDefinitionById
        .mockResolvedValueOnce(mockDefinition)
        .mockResolvedValueOnce({ ...newDef, steps: [], conditions: [] });
      repository.updateDefinition.mockResolvedValue({
        ...mockDefinition,
        isActive: false,
      });
      repository.createDefinition.mockResolvedValue(newDef);
      repository.createStep.mockResolvedValue(mockDefinition.steps[0]);
      repository.createCondition.mockResolvedValue(mockDefinition.conditions[0]);

      await service.update('wf-def-001', dto);

      // Verify steps were copied
      expect(repository.createStep).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowDefinition: { connect: { id: newDef.id } },
          name: 'IT Review',
          stepType: 'review',
          assignedRole: 'it_reviewer',
          sortOrder: 1,
        }),
      );

      // Verify conditions were copied
      expect(repository.createCondition).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowDefinition: { connect: { id: newDef.id } },
          fromStep: { connect: { id: 'step-001' } },
          toStep: { connect: { id: 'step-002' } },
          fieldName: 'impactLevel',
          operator: 'equals',
          value: 'major',
          priority: 1,
        }),
      );
    });
  });

  describe('activate', () => {
    it('should set isActive to true', async () => {
      const inactiveDef = { ...mockDefinition, isActive: false };
      repository.findDefinitionById.mockResolvedValue(inactiveDef);
      repository.updateDefinition.mockResolvedValue({
        ...inactiveDef,
        isActive: true,
      });

      const result = await service.activate('wf-def-001');

      expect(result.isActive).toBe(true);
      expect(repository.updateDefinition).toHaveBeenCalledWith('wf-def-001', {
        isActive: true,
      });
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(service.activate('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const nonDefaultDef = { ...mockDefinition, isDefault: false };
      repository.findDefinitionById.mockResolvedValue(nonDefaultDef);
      repository.updateDefinition.mockResolvedValue({
        ...nonDefaultDef,
        isActive: false,
      });

      const result = await service.deactivate('wf-def-001');

      expect(result.isActive).toBe(false);
      expect(repository.updateDefinition).toHaveBeenCalledWith('wf-def-001', {
        isActive: false,
      });
    });

    it('should throw BadRequestException if only active default', async () => {
      // This definition is the active default
      repository.findDefinitionById.mockResolvedValue(mockDefinition);
      // findActiveDefault returns the same definition (it's the only one)
      repository.findActiveDefault.mockResolvedValue(mockDefinition);

      await expect(service.deactivate('wf-def-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow deactivation if not a default', async () => {
      const nonDefaultDef = {
        ...mockDefinition,
        id: 'wf-def-002',
        isDefault: false,
      };
      repository.findDefinitionById.mockResolvedValue(nonDefaultDef);
      repository.updateDefinition.mockResolvedValue({
        ...nonDefaultDef,
        isActive: false,
      });

      const result = await service.deactivate('wf-def-002');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefault', () => {
    it('should unmark other defaults and mark as default', async () => {
      const nonDefaultDef = {
        ...mockDefinition,
        id: 'wf-def-002',
        isDefault: false,
      };

      repository.findDefinitionById.mockResolvedValue(nonDefaultDef);
      // Currently there's an existing default
      repository.findActiveDefault.mockResolvedValue(mockDefinition);
      repository.updateDefinition
        .mockResolvedValueOnce({ ...mockDefinition, isDefault: false }) // unmark old default
        .mockResolvedValueOnce({ ...nonDefaultDef, isDefault: true }); // mark new default

      const result = await service.setDefault('wf-def-002');

      // Verify old default was unmarked
      expect(repository.updateDefinition).toHaveBeenCalledWith(
        mockDefinition.id,
        { isDefault: false },
      );
      // Verify new default was marked
      expect(repository.updateDefinition).toHaveBeenCalledWith('wf-def-002', {
        isDefault: true,
      });
      expect(result.isDefault).toBe(true);
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(service.setDefault('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('should return definition with steps and conditions', async () => {
      repository.findDefinitionById.mockResolvedValue(mockDefinition);

      const result = await service.findById('wf-def-001');

      expect(result).toEqual(mockDefinition);
      expect(result.steps).toHaveLength(1);
      expect(result.conditions).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const paginatedResult = {
        data: [mockDefinition],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      };
      repository.findAllDefinitions.mockResolvedValue(paginatedResult);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findActiveDefault', () => {
    it('should return the active default definition', async () => {
      repository.findActiveDefault.mockResolvedValue(mockDefinition);

      const result = await service.findActiveDefault();

      expect(result).toEqual(mockDefinition);
      expect(result?.isDefault).toBe(true);
      expect(result?.isActive).toBe(true);
    });

    it('should return null when no active default exists', async () => {
      repository.findActiveDefault.mockResolvedValue(null);

      const result = await service.findActiveDefault();

      expect(result).toBeNull();
    });
  });
});
