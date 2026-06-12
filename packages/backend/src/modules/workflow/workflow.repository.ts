import { Injectable } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowCondition,
  WorkflowInstance,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Workflow definition with steps and conditions included */
export type WorkflowDefinitionWithRelations = WorkflowDefinition & {
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
};

/** Workflow step with related steps and conditions */
export type WorkflowStepWithRelations = WorkflowStep & {
  defaultNextStep: WorkflowStep | null;
  conditionsFrom: WorkflowCondition[];
};

/** Workflow instance with current step relation */
export type WorkflowInstanceWithCurrentStep = WorkflowInstance & {
  currentStep: WorkflowStep;
};

/** Pagination options */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  isActive?: boolean;
}

/** Paginated result */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * WorkflowRepository — Data access layer for workflow entities.
 *
 * Encapsulates all Prisma queries related to WorkflowDefinition,
 * WorkflowStep, and WorkflowCondition models.
 */
@Injectable()
export class WorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a workflow definition by ID with steps and conditions.
   */
  async findDefinitionById(
    id: string,
  ): Promise<WorkflowDefinitionWithRelations | null> {
    return this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        conditions: { orderBy: { priority: 'desc' } },
      },
    });
  }

  /**
   * Find the active default workflow definition.
   */
  async findActiveDefault(): Promise<WorkflowDefinitionWithRelations | null> {
    return this.prisma.workflowDefinition.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        conditions: { orderBy: { priority: 'desc' } },
      },
    });
  }

  /**
   * List all workflow definitions with pagination.
   */
  async findAllDefinitions(
    options: PaginationOptions,
  ): Promise<PaginatedResult<WorkflowDefinition>> {
    const { page, pageSize, isActive } = options;

    const where: Prisma.WorkflowDefinitionWhereInput = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          steps: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.workflowDefinition.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Create a new workflow definition.
   */
  async createDefinition(
    data: Prisma.WorkflowDefinitionCreateInput,
  ): Promise<WorkflowDefinition> {
    return this.prisma.workflowDefinition.create({ data });
  }

  /**
   * Update a workflow definition.
   */
  async updateDefinition(
    id: string,
    data: Prisma.WorkflowDefinitionUpdateInput,
  ): Promise<WorkflowDefinition> {
    return this.prisma.workflowDefinition.update({
      where: { id },
      data,
    });
  }

  /**
   * Create a new workflow step.
   */
  async createStep(
    data: Prisma.WorkflowStepCreateInput,
  ): Promise<WorkflowStep> {
    return this.prisma.workflowStep.create({ data });
  }

  /**
   * Create a new workflow condition.
   */
  async createCondition(
    data: Prisma.WorkflowConditionCreateInput,
  ): Promise<WorkflowCondition> {
    return this.prisma.workflowCondition.create({ data });
  }

  /**
   * Find a workflow step by ID with relations.
   */
  async findStepById(id: string): Promise<WorkflowStepWithRelations | null> {
    return this.prisma.workflowStep.findUnique({
      where: { id },
      include: {
        defaultNextStep: true,
        conditionsFrom: { orderBy: { priority: 'desc' } },
      },
    });
  }

  /**
   * Find all steps for a workflow definition.
   */
  async findStepsByDefinitionId(
    workflowDefinitionId: string,
  ): Promise<WorkflowStep[]> {
    return this.prisma.workflowStep.findMany({
      where: { workflowDefinitionId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Find all conditions for a workflow definition.
   */
  async findConditionsByDefinitionId(
    workflowDefinitionId: string,
  ): Promise<WorkflowCondition[]> {
    return this.prisma.workflowCondition.findMany({
      where: { workflowDefinitionId },
      orderBy: { priority: 'desc' },
    });
  }

  // ─── WorkflowInstance Methods ───────────────────────────────────────────────

  /**
   * Create a new workflow instance.
   */
  async createInstance(
    data: Prisma.WorkflowInstanceCreateInput,
  ): Promise<WorkflowInstance> {
    return this.prisma.workflowInstance.create({ data });
  }

  /**
   * Find a workflow instance by ID with currentStep relation.
   */
  async findInstanceById(
    id: string,
  ): Promise<WorkflowInstanceWithCurrentStep | null> {
    return this.prisma.workflowInstance.findUnique({
      where: { id },
      include: { currentStep: true },
    });
  }

  /**
   * Update a workflow instance.
   */
  async updateInstance(
    id: string,
    data: Prisma.WorkflowInstanceUpdateInput,
  ): Promise<WorkflowInstance> {
    return this.prisma.workflowInstance.update({
      where: { id },
      data,
    });
  }

  /**
   * Find conditions originating from a specific step, ordered by priority desc.
   */
  async findConditionsByFromStepId(
    fromStepId: string,
  ): Promise<WorkflowCondition[]> {
    return this.prisma.workflowCondition.findMany({
      where: { fromStepId },
      orderBy: { priority: 'desc' },
    });
  }
}
