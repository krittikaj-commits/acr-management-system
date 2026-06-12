import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkflowStep, WorkflowCondition } from '@prisma/client';
import { WorkflowRepository } from './workflow.repository';

/**
 * Validation error returned when a workflow definition is invalid.
 */
export interface ValidationError {
  code: string; // e.g. 'NO_START_STEP', 'NO_END_STEP', 'ORPHAN_STEP', 'INVALID_REFERENCE'
  message: string;
  stepId?: string;
}

/**
 * Validation warning for non-blocking issues (e.g. cycles).
 */
export interface ValidationWarning {
  code: string; // e.g. 'CYCLE_DETECTED', 'UNREACHABLE_FROM_END'
  message: string;
  stepIds?: string[];
}

/**
 * Result of workflow definition validation.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * WorkflowValidatorService — Validates workflow definition integrity.
 *
 * Validates:
 * - Exactly one start step exists
 * - At least one end step exists
 * - All steps reachable from start (no orphans)
 * - All defaultNextStepId references are valid
 * - All condition fromStepId/toStepId references are valid
 * - Cycle detection (warning, not error — loops may be intentional)
 */
@Injectable()
export class WorkflowValidatorService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  /**
   * Validate a full workflow definition by ID.
   * Fetches steps and conditions from the database and runs validation.
   */
  async validate(workflowDefinitionId: string): Promise<ValidationResult> {
    const definition = await this.workflowRepository.findDefinitionById(
      workflowDefinitionId,
    );

    if (!definition) {
      throw new NotFoundException(
        `Workflow definition "${workflowDefinitionId}" not found`,
      );
    }

    return this.validateSteps(definition.steps, definition.conditions);
  }

  /**
   * Pure validation logic — no DB access, fully testable.
   * Validates workflow steps and conditions for integrity.
   */
  validateSteps(
    steps: WorkflowStep[],
    conditions: WorkflowCondition[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Build step ID set for fast lookups
    const stepIds = new Set(steps.map((s) => s.id));

    // ─── Rule: Exactly one start step ─────────────────────────────────────────
    const startSteps = steps.filter((s) => s.stepType === 'start');
    if (startSteps.length === 0) {
      errors.push({
        code: 'NO_START_STEP',
        message: 'Workflow must have exactly one start step',
      });
    } else if (startSteps.length > 1) {
      errors.push({
        code: 'MULTIPLE_START_STEPS',
        message: `Workflow has ${startSteps.length} start steps, expected exactly one`,
      });
    }

    // ─── Rule: At least one end step ──────────────────────────────────────────
    const endSteps = steps.filter((s) => s.stepType === 'end');
    if (endSteps.length === 0) {
      errors.push({
        code: 'NO_END_STEP',
        message: 'Workflow must have at least one end step',
      });
    }

    // ─── Rule: defaultNextStepId references must exist ────────────────────────
    for (const step of steps) {
      if (step.defaultNextStepId && !stepIds.has(step.defaultNextStepId)) {
        errors.push({
          code: 'INVALID_REFERENCE',
          message: `Step "${step.name}" (${step.id}) references non-existent defaultNextStepId "${step.defaultNextStepId}"`,
          stepId: step.id,
        });
      }
    }

    // ─── Rule: Condition step references must exist ───────────────────────────
    for (const condition of conditions) {
      if (!stepIds.has(condition.fromStepId)) {
        errors.push({
          code: 'INVALID_REFERENCE',
          message: `Condition "${condition.id}" references non-existent fromStepId "${condition.fromStepId}"`,
          stepId: condition.fromStepId,
        });
      }
      if (!stepIds.has(condition.toStepId)) {
        errors.push({
          code: 'INVALID_REFERENCE',
          message: `Condition "${condition.id}" references non-existent toStepId "${condition.toStepId}"`,
          stepId: condition.toStepId,
        });
      }
    }

    // ─── Rule: All steps reachable from start (no orphans) ────────────────────
    if (startSteps.length === 1) {
      const reachable = this.findReachableSteps(startSteps[0], steps, conditions);
      const orphanSteps = steps.filter((s) => !reachable.has(s.id));

      for (const orphan of orphanSteps) {
        errors.push({
          code: 'ORPHAN_STEP',
          message: `Step "${orphan.name}" (${orphan.id}) is not reachable from the start step`,
          stepId: orphan.id,
        });
      }
    }

    // ─── Warning: Cycle detection ─────────────────────────────────────────────
    if (startSteps.length === 1) {
      const cycleSteps = this.detectCycles(startSteps[0], steps, conditions);
      if (cycleSteps.length > 0) {
        warnings.push({
          code: 'CYCLE_DETECTED',
          message: `Workflow contains a cycle involving steps: ${cycleSteps.join(', ')}`,
          stepIds: cycleSteps,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Find all steps reachable from the start step using BFS.
   * Follows both defaultNextStepId edges and condition toStepId edges.
   */
  private findReachableSteps(
    startStep: WorkflowStep,
    steps: WorkflowStep[],
    conditions: WorkflowCondition[],
  ): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [startStep.id];

    // Build adjacency: stepId → set of next step IDs
    const adjacency = this.buildAdjacencyMap(steps, conditions);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachable.has(currentId)) continue;
      reachable.add(currentId);

      const neighbors = adjacency.get(currentId) ?? [];
      for (const neighborId of neighbors) {
        if (!reachable.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    return reachable;
  }

  /**
   * Detect cycles using DFS with coloring (white/gray/black).
   * Returns step IDs involved in cycles if any are found.
   */
  private detectCycles(
    startStep: WorkflowStep,
    steps: WorkflowStep[],
    conditions: WorkflowCondition[],
  ): string[] {
    const adjacency = this.buildAdjacencyMap(steps, conditions);

    // DFS coloring: 0=white (unvisited), 1=gray (in stack), 2=black (done)
    const color = new Map<string, number>();
    for (const step of steps) {
      color.set(step.id, 0);
    }

    const cycleNodes: Set<string> = new Set();

    const dfs = (nodeId: string): boolean => {
      color.set(nodeId, 1); // Mark as in-progress (gray)

      const neighbors = adjacency.get(nodeId) ?? [];
      for (const neighborId of neighbors) {
        const neighborColor = color.get(neighborId) ?? 0;
        if (neighborColor === 1) {
          // Back edge found — cycle detected
          cycleNodes.add(nodeId);
          cycleNodes.add(neighborId);
          return true;
        }
        if (neighborColor === 0) {
          if (dfs(neighborId)) {
            cycleNodes.add(nodeId);
          }
        }
      }

      color.set(nodeId, 2); // Mark as done (black)
      return false;
    };

    dfs(startStep.id);

    return Array.from(cycleNodes);
  }

  /**
   * Build an adjacency map from steps and conditions.
   * Maps each step ID to the set of step IDs it can transition to.
   */
  private buildAdjacencyMap(
    steps: WorkflowStep[],
    conditions: WorkflowCondition[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    // Initialize with empty arrays
    for (const step of steps) {
      adjacency.set(step.id, []);
    }

    // Add defaultNextStepId edges
    for (const step of steps) {
      if (step.defaultNextStepId) {
        const neighbors = adjacency.get(step.id) ?? [];
        neighbors.push(step.defaultNextStepId);
        adjacency.set(step.id, neighbors);
      }
    }

    // Add condition toStepId edges
    for (const condition of conditions) {
      const neighbors = adjacency.get(condition.fromStepId) ?? [];
      neighbors.push(condition.toStepId);
      adjacency.set(condition.fromStepId, neighbors);
    }

    return adjacency;
  }
}
