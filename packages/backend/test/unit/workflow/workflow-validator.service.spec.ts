import { NotFoundException } from '@nestjs/common';
import { WorkflowStep, WorkflowCondition } from '@prisma/client';
import {
  WorkflowValidatorService,
  ValidationResult,
} from '../../../src/modules/workflow/workflow-validator.service';
import { WorkflowRepository } from '../../../src/modules/workflow/workflow.repository';

describe('WorkflowValidatorService', () => {
  let service: WorkflowValidatorService;
  let repository: jest.Mocked<WorkflowRepository>;

  // ─── Helper: create a WorkflowStep fixture ──────────────────────────────────

  function createStep(
    overrides: Partial<WorkflowStep> & { id: string; stepType: string },
  ): WorkflowStep {
    return {
      workflowDefinitionId: 'wf-def-001',
      name: overrides.id,
      assignedRole: 'system',
      requiredFields: null,
      sortOrder: 0,
      defaultNextStepId: null,
      createdAt: new Date('2024-01-01'),
      ...overrides,
    } as WorkflowStep;
  }

  // ─── Helper: create a WorkflowCondition fixture ─────────────────────────────

  function createCondition(
    overrides: Partial<WorkflowCondition> & {
      id: string;
      fromStepId: string;
      toStepId: string;
    },
  ): WorkflowCondition {
    return {
      workflowDefinitionId: 'wf-def-001',
      fieldName: 'changeType',
      operator: 'equals',
      value: 'emergency',
      priority: 10,
      ...overrides,
    } as WorkflowCondition;
  }

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

    service = new WorkflowValidatorService(repository);
  });

  // ─── validate (with DB lookup) ──────────────────────────────────────────────

  describe('validate', () => {
    it('should throw NotFoundException when definition does not exist', async () => {
      repository.findDefinitionById.mockResolvedValue(null);

      await expect(service.validate('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate a definition fetched from the database', async () => {
      const steps = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'end' }),
        createStep({ id: 'end', stepType: 'end' }),
      ];

      repository.findDefinitionById.mockResolvedValue({
        id: 'wf-def-001',
        name: 'Test Workflow',
        versionNumber: 1,
        isActive: true,
        isDefault: true,
        metadata: null,
        createdAt: new Date(),
        createdById: 'user-001',
        steps,
        conditions: [],
      });

      const result = await service.validate('wf-def-001');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ─── validateSteps — Valid workflows ────────────────────────────────────────

  describe('validateSteps — valid workflows', () => {
    it('should pass validation for a valid linear workflow', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'review', sortOrder: 0 }),
        createStep({ id: 'review', stepType: 'review', defaultNextStepId: 'approval', sortOrder: 1 }),
        createStep({ id: 'approval', stepType: 'approval', defaultNextStepId: 'impl', sortOrder: 2 }),
        createStep({ id: 'impl', stepType: 'implementation', defaultNextStepId: 'end', sortOrder: 3 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 4 }),
      ];

      const result = service.validateSteps(steps, []);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass validation for a workflow with conditions', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'review', sortOrder: 0 }),
        createStep({ id: 'review', stepType: 'review', defaultNextStepId: 'approval', sortOrder: 1 }),
        createStep({ id: 'approval', stepType: 'approval', defaultNextStepId: 'end', sortOrder: 2 }),
        createStep({ id: 'impl', stepType: 'implementation', defaultNextStepId: 'end', sortOrder: 3 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 4 }),
      ];

      const conditions: WorkflowCondition[] = [
        createCondition({
          id: 'cond-1',
          fromStepId: 'review',
          toStepId: 'impl',
        }),
      ];

      const result = service.validateSteps(steps, conditions);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ─── validateSteps — No start step ──────────────────────────────────────────

  describe('validateSteps — no start step', () => {
    it('should reject workflow without a start step', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'review', stepType: 'review', defaultNextStepId: 'end', sortOrder: 0 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 1 }),
      ];

      const result = service.validateSteps(steps, []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'NO_START_STEP' }),
        ]),
      );
    });
  });

  // ─── validateSteps — No end step ────────────────────────────────────────────

  describe('validateSteps — no end step', () => {
    it('should reject workflow without an end step', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'review', sortOrder: 0 }),
        createStep({ id: 'review', stepType: 'review', sortOrder: 1 }),
      ];

      const result = service.validateSteps(steps, []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'NO_END_STEP' }),
        ]),
      );
    });
  });

  // ─── validateSteps — Orphan step ────────────────────────────────────────────

  describe('validateSteps — orphan step (unreachable from start)', () => {
    it('should reject workflow with an unreachable step', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'end', sortOrder: 0 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 1 }),
        createStep({ id: 'orphan', stepType: 'review', sortOrder: 2 }), // no edges lead here
      ];

      const result = service.validateSteps(steps, []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'ORPHAN_STEP',
            stepId: 'orphan',
          }),
        ]),
      );
    });
  });

  // ─── validateSteps — Invalid defaultNextStepId reference ────────────────────

  describe('validateSteps — invalid defaultNextStepId reference', () => {
    it('should reject workflow with defaultNextStepId pointing to non-existent step', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'non-existent', sortOrder: 0 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 1 }),
      ];

      const result = service.validateSteps(steps, []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'INVALID_REFERENCE',
            stepId: 'start',
          }),
        ]),
      );
    });
  });

  // ─── validateSteps — Cycle detection (warning) ──────────────────────────────

  describe('validateSteps — cycle detection', () => {
    it('should warn about cycles when a step points back to an earlier step', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'review', sortOrder: 0 }),
        createStep({ id: 'review', stepType: 'review', defaultNextStepId: 'approval', sortOrder: 1 }),
        createStep({ id: 'approval', stepType: 'approval', defaultNextStepId: 'end', sortOrder: 2 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 3 }),
      ];

      // Condition creates a back-edge: approval → review (rejection loop)
      const conditions: WorkflowCondition[] = [
        createCondition({
          id: 'cond-reject',
          fromStepId: 'approval',
          toStepId: 'review',
          fieldName: 'decision',
          operator: 'equals',
          value: 'rejected',
        }),
      ];

      const result = service.validateSteps(steps, conditions);

      // Should still be valid (cycles are warnings, not errors)
      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'CYCLE_DETECTED' }),
        ]),
      );
      // The cycle involves at least review and approval
      const cycleWarning = result.warnings.find(
        (w) => w.code === 'CYCLE_DETECTED',
      );
      expect(cycleWarning?.stepIds).toEqual(
        expect.arrayContaining(['review', 'approval']),
      );
    });
  });

  // ─── validateSteps — Condition referencing non-existent step ────────────────

  describe('validateSteps — condition referencing non-existent step', () => {
    it('should reject workflow when condition fromStepId does not exist', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'end', sortOrder: 0 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 1 }),
      ];

      const conditions: WorkflowCondition[] = [
        createCondition({
          id: 'cond-bad-from',
          fromStepId: 'non-existent-from',
          toStepId: 'end',
        }),
      ];

      const result = service.validateSteps(steps, conditions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'INVALID_REFERENCE',
            stepId: 'non-existent-from',
          }),
        ]),
      );
    });

    it('should reject workflow when condition toStepId does not exist', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'start', stepType: 'start', defaultNextStepId: 'end', sortOrder: 0 }),
        createStep({ id: 'end', stepType: 'end', sortOrder: 1 }),
      ];

      const conditions: WorkflowCondition[] = [
        createCondition({
          id: 'cond-bad-to',
          fromStepId: 'start',
          toStepId: 'non-existent-to',
        }),
      ];

      const result = service.validateSteps(steps, conditions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'INVALID_REFERENCE',
            stepId: 'non-existent-to',
          }),
        ]),
      );
    });
  });

  // ─── validateSteps — Multiple errors combined ───────────────────────────────

  describe('validateSteps — multiple errors combined', () => {
    it('should report multiple errors for a thoroughly broken workflow', () => {
      const steps: WorkflowStep[] = [
        createStep({ id: 'review', stepType: 'review', defaultNextStepId: 'nowhere', sortOrder: 0 }),
      ];

      const result = service.validateSteps(steps, []);

      expect(result.isValid).toBe(false);
      // Should have: NO_START_STEP, NO_END_STEP, INVALID_REFERENCE
      expect(result.errors.length).toBeGreaterThanOrEqual(3);

      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain('NO_START_STEP');
      expect(codes).toContain('NO_END_STEP');
      expect(codes).toContain('INVALID_REFERENCE');
    });
  });
});
