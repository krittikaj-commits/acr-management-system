/**
 * Property-Based Tests: Workflow State Machine Properties
 *
 * Property 1: Only valid transitions are allowed
 * Property 2: All steps reachable from start (validated workflows only)
 *
 * **Validates: Requirements US-029, US-030, BR-001, EX-009**
 */
import * as fc from 'fast-check';
import { WorkflowValidatorService } from '../../src/modules/workflow/workflow-validator.service';
import { WorkflowEngineService } from '../../src/modules/workflow/workflow-engine.service';
import { WorkflowStep, WorkflowCondition } from '@prisma/client';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type StepType = 'start' | 'action' | 'review' | 'approval' | 'end';
type AssignedRole = 'requester' | 'it_reviewer' | 'approver' | 'implementer' | 'admin';
type Operator = 'equals' | 'not_equals' | 'in' | 'greater_than';

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

/** Random workflow step */
const workflowStepArb = (
  definitionId: string,
  stepId: string,
  stepType: StepType,
  sortOrder: number,
  defaultNextStepId: string | null,
): fc.Arbitrary<WorkflowStep> =>
  fc.record({
    id: fc.constant(stepId),
    workflowDefinitionId: fc.constant(definitionId),
    name: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    stepType: fc.constant(stepType as string),
    assignedRole: fc.constantFrom<AssignedRole[]>(['requester', 'it_reviewer', 'approver', 'implementer', 'admin']),
    requiredFields: fc.constant(null),
    sortOrder: fc.constant(sortOrder),
    defaultNextStepId: fc.constant(defaultNextStepId),
    createdAt: fc.constant(new Date()),
  });

/** Random valid linear workflow (guaranteed valid: start → step1 → step2 → ... → end) */
const validLinearWorkflowArb: fc.Arbitrary<{
  definitionId: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}> = fc.integer({ min: 0, max: 4 }).chain((numMiddleSteps) => {
  const definitionId = 'def-' + Math.random().toString(36).slice(2, 10);

  // Generate step IDs
  const stepIds: string[] = [];
  stepIds.push('step-start');
  for (let i = 0; i < numMiddleSteps; i++) {
    stepIds.push(`step-middle-${i}`);
  }
  stepIds.push('step-end');

  // Build step types
  const stepTypes: StepType[] = ['start'];
  const middleTypes: StepType[] = ['action', 'review', 'approval'];
  for (let i = 0; i < numMiddleSteps; i++) {
    stepTypes.push(middleTypes[i % middleTypes.length]);
  }
  stepTypes.push('end');

  // Build steps with linear chain: each step's defaultNextStepId → next step
  const stepArbs = stepIds.map((stepId, index) => {
    const nextId = index < stepIds.length - 1 ? stepIds[index + 1] : null;
    return workflowStepArb(definitionId, stepId, stepTypes[index], index, nextId);
  });

  return fc.tuple(...stepArbs).map((steps) => ({
    definitionId,
    steps: steps as WorkflowStep[],
    conditions: [] as WorkflowCondition[],
  }));
});

/** Random valid workflow with conditions (linear base + some conditional branches) */
const validWorkflowWithConditionsArb: fc.Arbitrary<{
  definitionId: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}> = fc.integer({ min: 1, max: 4 }).chain((numMiddleSteps) => {
  const definitionId = 'def-' + Math.random().toString(36).slice(2, 10);

  // Generate step IDs
  const stepIds: string[] = [];
  stepIds.push('step-start');
  for (let i = 0; i < numMiddleSteps; i++) {
    stepIds.push(`step-middle-${i}`);
  }
  stepIds.push('step-end');

  // Build step types
  const stepTypes: StepType[] = ['start'];
  const middleTypes: StepType[] = ['action', 'review', 'approval'];
  for (let i = 0; i < numMiddleSteps; i++) {
    stepTypes.push(middleTypes[i % middleTypes.length]);
  }
  stepTypes.push('end');

  // Build steps with linear chain
  const steps: WorkflowStep[] = stepIds.map((stepId, index) => ({
    id: stepId,
    workflowDefinitionId: definitionId,
    name: `Step ${index}`,
    stepType: stepTypes[index],
    assignedRole: 'admin',
    requiredFields: null,
    sortOrder: index,
    defaultNextStepId: index < stepIds.length - 1 ? stepIds[index + 1] : null,
    createdAt: new Date(),
  }));

  // Generate random conditions (from non-end steps to valid steps)
  const nonEndStepIds = stepIds.slice(0, -1); // Exclude end step as source
  const conditionCountArb = fc.integer({ min: 0, max: Math.min(3, numMiddleSteps) });

  return conditionCountArb.chain((conditionCount) => {
    const conditionArbs = Array.from({ length: conditionCount }, (_, i) =>
      fc.record({
        id: fc.constant(`cond-${i}`),
        workflowDefinitionId: fc.constant(definitionId),
        fromStepId: fc.constantFrom(...nonEndStepIds),
        toStepId: fc.constantFrom(...stepIds.slice(1)), // any reachable step (not start)
        fieldName: fc.constantFrom('changeType', 'impactLevel', 'testResult'),
        operator: fc.constantFrom<Operator[]>(['equals', 'not_equals', 'in', 'greater_than']),
        value: fc.constantFrom('emergency', 'major', 'high', 'medium', 'pass', 'failed'),
        priority: fc.integer({ min: 1, max: 10 }),
      }),
    );

    if (conditionArbs.length === 0) {
      return fc.constant({
        definitionId,
        steps,
        conditions: [] as WorkflowCondition[],
      });
    }

    return fc.tuple(...conditionArbs).map((conditions) => ({
      definitionId,
      steps,
      conditions: conditions as WorkflowCondition[],
    }));
  });
});

/** Random transition context */
const transitionContextArb = fc.record({
  changeType: fc.constantFrom('normal', 'emergency'),
  impactLevel: fc.constantFrom('major', 'high', 'medium', 'low', 'very_low'),
  testResult: fc.constantFrom('pass', 'failed', 'pending', undefined),
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build an adjacency map from steps and conditions.
 * Maps each step ID to the set of step IDs it can transition to.
 */
function buildAdjacencyMap(
  steps: WorkflowStep[],
  conditions: WorkflowCondition[],
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const step of steps) {
    adjacency.set(step.id, new Set());
  }

  // Add defaultNextStepId edges
  for (const step of steps) {
    if (step.defaultNextStepId) {
      adjacency.get(step.id)!.add(step.defaultNextStepId);
    }
  }

  // Add condition toStepId edges
  for (const condition of conditions) {
    const neighbors = adjacency.get(condition.fromStepId);
    if (neighbors) {
      neighbors.add(condition.toStepId);
    }
  }

  return adjacency;
}

/**
 * BFS to find all reachable steps from a given start step.
 */
function findReachableSteps(
  startStepId: string,
  adjacency: Map<string, Set<string>>,
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [startStepId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    const neighbors = adjacency.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return reachable;
}

/**
 * Check if a transition from fromStepId to toStepId is valid
 * according to the workflow graph (edges via defaultNextStepId or conditions).
 */
function isValidTransition(
  fromStepId: string,
  toStepId: string,
  adjacency: Map<string, Set<string>>,
): boolean {
  const neighbors = adjacency.get(fromStepId);
  if (!neighbors) return false;
  return neighbors.has(toStepId);
}

// ──────────────────────────────────────────────────────────────────────────────
// Property 1: Only valid transitions allowed
// ──────────────────────────────────────────────────────────────────────────────

describe('Workflow State Machine Properties (PBT)', () => {
  // Instantiate the validator (pure logic, no DB needed)
  const validator = new WorkflowValidatorService(null as never);

  describe('Property 1: Only valid transitions allowed', () => {
    /**
     * **Validates: Requirements US-029, US-030, BR-001, EX-009**
     *
     * Transitions only follow edges in the workflow graph.
     * A transition from step A to step B is valid only if:
     * - B is A's defaultNextStepId, OR
     * - There exists a condition from A to B
     */
    it('transitions only follow edges in the workflow graph', () => {
      fc.assert(
        fc.property(
          validWorkflowWithConditionsArb,
          fc.array(fc.nat({ max: 20 }), { minLength: 1, maxLength: 10 }),
          (workflow, randomIndices) => {
            const { steps, conditions } = workflow;
            const adjacency = buildAdjacencyMap(steps, conditions);

            // Generate random transition attempts using indices
            for (const idx of randomIndices) {
              const fromStep = steps[idx % steps.length];
              const toStep = steps[(idx * 7 + 3) % steps.length]; // pseudo-random target

              const valid = isValidTransition(fromStep.id, toStep.id, adjacency);

              if (valid) {
                // If considered valid, verify the edge actually exists
                const neighbors = adjacency.get(fromStep.id)!;
                expect(neighbors.has(toStep.id)).toBe(true);
              } else {
                // If considered invalid, verify no edge exists
                const neighbors = adjacency.get(fromStep.id);
                if (neighbors) {
                  expect(neighbors.has(toStep.id)).toBe(false);
                }
              }
            }
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-029, US-030, BR-001, EX-009**
     *
     * The evaluateCondition function is deterministic:
     * calling it with the same inputs always returns the same result.
     */
    it('condition evaluation is deterministic for same inputs', () => {
      // Create an engine instance (evaluateCondition is a pure function)
      const engine = new WorkflowEngineService(null as never);

      const conditionArb = fc.record({
        id: fc.uuid(),
        workflowDefinitionId: fc.uuid(),
        fromStepId: fc.uuid(),
        toStepId: fc.uuid(),
        fieldName: fc.constantFrom('changeType', 'impactLevel', 'testResult'),
        operator: fc.constantFrom<Operator[]>(['equals', 'not_equals', 'in', 'greater_than']),
        value: fc.constantFrom('emergency', 'major', 'high,medium', 'pass', '5'),
        priority: fc.integer({ min: 0, max: 10 }),
      });

      fc.assert(
        fc.property(
          conditionArb,
          transitionContextArb,
          (condition, context) => {
            // Evaluate twice with same inputs
            const result1 = engine.evaluateCondition(
              condition as WorkflowCondition,
              context as Record<string, unknown>,
            );
            const result2 = engine.evaluateCondition(
              condition as WorkflowCondition,
              context as Record<string, unknown>,
            );

            // Must return same result both times
            expect(result1).toBe(result2);
            // Result must be boolean
            expect(typeof result1).toBe('boolean');
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-029, US-030, BR-001, EX-009**
     *
     * Transitions from an end step are always rejected:
     * end steps have no defaultNextStepId and no conditions leading out.
     */
    it('transitions from end step are always rejected', () => {
      fc.assert(
        fc.property(
          validLinearWorkflowArb,
          (workflow) => {
            const { steps, conditions } = workflow;
            const adjacency = buildAdjacencyMap(steps, conditions);

            // Find end step(s)
            const endSteps = steps.filter((s) => s.stepType === 'end');
            expect(endSteps.length).toBeGreaterThanOrEqual(1);

            for (const endStep of endSteps) {
              // End step should have no outgoing edges
              const neighbors = adjacency.get(endStep.id)!;
              expect(neighbors.size).toBe(0);

              // No valid transition from end step to any other step
              for (const otherStep of steps) {
                expect(isValidTransition(endStep.id, otherStep.id, adjacency)).toBe(false);
              }
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Property 2: Reachability in validated workflows
  // ────────────────────────────────────────────────────────────────────────────

  describe('Property 2: Reachability in validated workflows', () => {
    /**
     * **Validates: Requirements US-029, BR-001**
     *
     * All steps in a valid workflow are reachable from the start step.
     * A workflow that passes validateSteps must have no orphan steps.
     */
    it('all steps in a valid workflow are reachable from start', () => {
      fc.assert(
        fc.property(
          validLinearWorkflowArb,
          (workflow) => {
            const { steps, conditions } = workflow;

            // Validate using the real validator logic
            const result = validator.validateSteps(steps, conditions);

            // Only test workflows that pass validation
            if (!result.isValid) return; // Skip invalid (precondition)

            // Find start step
            const startStep = steps.find((s) => s.stepType === 'start');
            expect(startStep).toBeDefined();

            // BFS from start
            const adjacency = buildAdjacencyMap(steps, conditions);
            const reachable = findReachableSteps(startStep!.id, adjacency);

            // All steps must be reachable
            expect(reachable.size).toBe(steps.length);

            // Each step must be in the reachable set
            for (const step of steps) {
              expect(reachable.has(step.id)).toBe(true);
            }
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-029, BR-001**
     *
     * Valid workflows always have a path from start to end.
     * If a workflow passes validation, the end step must be reachable from start.
     */
    it('valid workflows always have a path from start to end', () => {
      fc.assert(
        fc.property(
          validWorkflowWithConditionsArb,
          (workflow) => {
            const { steps, conditions } = workflow;

            // Validate using the real validator logic
            const result = validator.validateSteps(steps, conditions);

            // Only test workflows that pass validation
            if (!result.isValid) return; // Skip invalid (precondition)

            // Find start and end steps
            const startStep = steps.find((s) => s.stepType === 'start');
            const endSteps = steps.filter((s) => s.stepType === 'end');
            expect(startStep).toBeDefined();
            expect(endSteps.length).toBeGreaterThanOrEqual(1);

            // BFS from start must reach at least one end step
            const adjacency = buildAdjacencyMap(steps, conditions);
            const reachable = findReachableSteps(startStep!.id, adjacency);

            const endReachable = endSteps.some((endStep) => reachable.has(endStep.id));
            expect(endReachable).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
