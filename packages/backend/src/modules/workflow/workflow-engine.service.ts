import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WorkflowCondition, WorkflowStep } from '@prisma/client';
import {
  WorkflowRepository,
  WorkflowInstanceWithCurrentStep,
} from './workflow.repository';

/**
 * Context data used to evaluate workflow conditions and determine transitions.
 * Contains CR fields that conditions can evaluate against.
 */
export interface TransitionContext {
  changeType?: string;
  impactLevel?: string;
  testResult?: string;
  [key: string]: unknown;
}

/**
 * WorkflowEngineService — State machine engine for workflow transitions.
 *
 * Responsibilities:
 * - Create workflow instances locked to a definition version
 * - Transition instances between steps (validate, evaluate conditions, move)
 * - Evaluate field-based conditions for routing (priority-ordered, first-match)
 * - Provide current step and instance status queries
 */
@Injectable()
export class WorkflowEngineService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  /**
   * Create a new workflow instance for a change request.
   * - Locks the instance to the current workflow definition version
   * - Sets the current step to the start step (stepType='start')
   * - Sets status to 'active'
   */
  async createInstance(
    workflowDefinitionId: string,
    changeRequestId: string,
  ): Promise<WorkflowInstanceWithCurrentStep> {
    const definition =
      await this.workflowRepository.findDefinitionById(workflowDefinitionId);
    if (!definition) {
      throw new NotFoundException(
        `Workflow definition "${workflowDefinitionId}" not found`,
      );
    }

    // Find the start step
    const startStep = definition.steps.find(
      (step) => step.stepType === 'start',
    );
    if (!startStep) {
      throw new BadRequestException(
        `Workflow definition "${workflowDefinitionId}" has no start step`,
      );
    }

    const instance = await this.workflowRepository.createInstance({
      workflowDefinition: { connect: { id: workflowDefinitionId } },
      currentStep: { connect: { id: startStep.id } },
      changeRequest: { connect: { id: changeRequestId } },
      status: 'active',
      workflowVersion: definition.versionNumber,
    });

    // Return instance with currentStep relation
    const result = await this.workflowRepository.findInstanceById(instance.id);
    if (!result) {
      throw new NotFoundException('Failed to retrieve newly created workflow instance');
    }

    return result;
  }

  /**
   * Transition a workflow instance to the next step.
   * - Validates instance exists and is 'active'
   * - Evaluates conditions to determine next step
   * - Falls back to defaultNextStepId if no conditions match
   * - Sets status='completed' if reaching an 'end' step
   */
  async transition(
    instanceId: string,
    context: TransitionContext,
  ): Promise<WorkflowInstanceWithCurrentStep> {
    const instance = await this.workflowRepository.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundException(
        `Workflow instance "${instanceId}" not found`,
      );
    }

    if (instance.status !== 'active') {
      throw new BadRequestException(
        `Cannot transition workflow instance "${instanceId}" — status is "${instance.status}"`,
      );
    }

    // Determine next step: conditions first, then defaultNextStepId
    const nextStepId = await this.evaluateConditions(
      instance.currentStep,
      context,
    );

    if (!nextStepId) {
      throw new BadRequestException(
        `No valid transition from step "${instance.currentStep.name}" (${instance.currentStep.id})`,
      );
    }

    // Verify the target step exists
    const nextStep = await this.workflowRepository.findStepById(nextStepId);
    if (!nextStep) {
      throw new NotFoundException(
        `Target step "${nextStepId}" not found`,
      );
    }

    // Determine if this completes the workflow
    const isEndStep = nextStep.stepType === 'end';

    // Update the instance
    await this.workflowRepository.updateInstance(instanceId, {
      currentStep: { connect: { id: nextStepId } },
      ...(isEndStep && {
        status: 'completed',
        completedAt: new Date(),
      }),
    });

    // Return the updated instance with relations
    const updatedInstance =
      await this.workflowRepository.findInstanceById(instanceId);
    if (!updatedInstance) {
      throw new NotFoundException('Failed to retrieve updated workflow instance');
    }

    return updatedInstance;
  }

  /**
   * Evaluate conditions for a step to determine the next step.
   * - Gets all conditions WHERE fromStepId = currentStep.id
   * - Orders by priority (highest first)
   * - Returns the FIRST matching condition's toStepId
   * - Falls back to defaultNextStepId if no conditions match
   */
  async evaluateConditions(
    currentStep: WorkflowStep,
    context: TransitionContext,
  ): Promise<string | null> {
    const conditions =
      await this.workflowRepository.findConditionsByFromStepId(currentStep.id);

    if (conditions.length > 0) {
      for (const condition of conditions) {
        if (this.evaluateCondition(condition, context)) {
          return condition.toStepId;
        }
      }
    }

    // Fall back to defaultNextStepId
    return currentStep.defaultNextStepId ?? null;
  }

  /**
   * Evaluate a single condition against the transition context.
   * Supports operators: equals, not_equals, in, greater_than
   */
  evaluateCondition(
    condition: WorkflowCondition,
    context: Record<string, unknown>,
  ): boolean {
    const fieldValue = context[condition.fieldName];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return String(fieldValue) === conditionValue;

      case 'not_equals':
        return String(fieldValue) !== conditionValue;

      case 'in': {
        const allowedValues = conditionValue
          .split(',')
          .map((v) => v.trim());
        return allowedValues.includes(String(fieldValue));
      }

      case 'greater_than': {
        const numericField = Number(fieldValue);
        const numericCondition = Number(conditionValue);
        if (isNaN(numericField) || isNaN(numericCondition)) {
          return false;
        }
        return numericField > numericCondition;
      }

      default:
        return false;
    }
  }

  /**
   * Get the current step of a workflow instance.
   */
  async getCurrentStep(instanceId: string): Promise<WorkflowStep> {
    const instance = await this.workflowRepository.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundException(
        `Workflow instance "${instanceId}" not found`,
      );
    }

    return instance.currentStep;
  }

  /**
   * Get instance status with current step info.
   */
  async getInstanceStatus(
    instanceId: string,
  ): Promise<WorkflowInstanceWithCurrentStep> {
    const instance = await this.workflowRepository.findInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundException(
        `Workflow instance "${instanceId}" not found`,
      );
    }

    return instance;
  }
}
