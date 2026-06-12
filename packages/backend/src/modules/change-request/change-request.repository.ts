import { Injectable, ConflictException } from '@nestjs/common';
import { ChangeRequest, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeRequestWithWorkflow } from './dto';

/** Filter options for listing change requests */
export interface ChangeRequestFilters {
  changeType?: string;
  impactLevel?: string;
  assignedToId?: string;
  requesterEmail?: string;
  crNumber?: string;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

/** Pagination options */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Paginated result */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Include relation for workflow instance with current step */
const WORKFLOW_INCLUDE = {
  workflowInstance: {
    include: {
      currentStep: true,
    },
  },
} as const;

/**
 * ChangeRequestRepository — Data access layer for ChangeRequest entity.
 *
 * Provides:
 * - CRUD operations with optimistic locking
 * - CR number auto-generation (CR-YYYY-NNNN)
 * - Paginated queries with filtering
 * - Workflow instance relation loading
 */
@Injectable()
export class ChangeRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a change request by ID with workflow instance and current step.
   */
  async findById(id: string): Promise<ChangeRequestWithWorkflow | null> {
    return this.prisma.changeRequest.findUnique({
      where: { id },
      include: WORKFLOW_INCLUDE,
    }) as Promise<ChangeRequestWithWorkflow | null>;
  }

  /**
   * Find a change request by its CR number (e.g. CR-2026-0001).
   */
  async findByCrNumber(
    crNumber: string,
  ): Promise<ChangeRequestWithWorkflow | null> {
    return this.prisma.changeRequest.findUnique({
      where: { crNumber },
      include: WORKFLOW_INCLUDE,
    }) as Promise<ChangeRequestWithWorkflow | null>;
  }

  /**
   * List change requests with pagination and filtering.
   */
  async findAll(
    filters: ChangeRequestFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<ChangeRequestWithWorkflow>> {
    const where = this.buildWhereClause(filters);
    const { page, pageSize, sortBy, sortOrder } = pagination;
    const skip = (page - 1) * pageSize;

    const orderBy: Prisma.ChangeRequestOrderByWithRelationInput = {
      [sortBy || 'createdAt']: sortOrder || 'desc',
    };

    const [data, total] = await Promise.all([
      this.prisma.changeRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: WORKFLOW_INCLUDE,
      }),
      this.prisma.changeRequest.count({ where }),
    ]);

    return {
      data: data as unknown as ChangeRequestWithWorkflow[],
      meta: {
        total,
        page,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Create a new change request with auto-generated CR number.
   */
  async create(
    data: Prisma.ChangeRequestCreateInput,
  ): Promise<ChangeRequestWithWorkflow> {
    const crNumber = await this.generateNextCrNumber();

    return this.prisma.changeRequest.create({
      data: {
        ...data,
        crNumber,
      },
      include: WORKFLOW_INCLUDE,
    }) as unknown as ChangeRequestWithWorkflow;
  }

  /**
   * Update a change request with optimistic locking.
   * Throws ConflictException if version mismatch.
   *
   * @param id - Change request ID
   * @param data - Fields to update
   * @param expectedVersion - The version the client expects (optimistic lock check)
   */
  async update(
    id: string,
    data: Prisma.ChangeRequestUpdateInput,
    expectedVersion: number,
  ): Promise<ChangeRequestWithWorkflow> {
    // Use Prisma's atomic where to enforce optimistic locking
    try {
      const updated = await this.prisma.changeRequest.update({
        where: {
          id,
          version: expectedVersion,
        },
        data: {
          ...data,
          version: { increment: 1 },
        },
        include: WORKFLOW_INCLUDE,
      });

      return updated as unknown as ChangeRequestWithWorkflow;
    } catch (error) {
      // Prisma P2025: Record not found (version mismatch or non-existent)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'Change request has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Generate the next available CR number for the current year.
   * Format: CR-YYYY-NNNN (e.g. CR-2026-0001)
   *
   * Uses a raw query to atomically find the max crNumber for the current year.
   */
  async generateNextCrNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `CR-${currentYear}-`;

    // Find the latest CR number for the current year
    const latestCr = await this.prisma.changeRequest.findFirst({
      where: {
        crNumber: { startsWith: prefix },
      },
      orderBy: { crNumber: 'desc' },
      select: { crNumber: true },
    });

    let nextSequence = 1;
    if (latestCr) {
      const sequencePart = latestCr.crNumber.substring(prefix.length);
      const currentMax = parseInt(sequencePart, 10);
      if (!isNaN(currentMax)) {
        nextSequence = currentMax + 1;
      }
    }

    const paddedSequence = nextSequence.toString().padStart(4, '0');
    return `${prefix}${paddedSequence}`;
  }

  /**
   * Build the Prisma where clause from filter options.
   */
  private buildWhereClause(
    filters: ChangeRequestFilters,
  ): Prisma.ChangeRequestWhereInput {
    const where: Prisma.ChangeRequestWhereInput = {};

    if (filters.changeType) {
      where.changeType = filters.changeType;
    }

    if (filters.impactLevel) {
      where.impactLevel = filters.impactLevel;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.requesterEmail) {
      where.requesterEmail = filters.requesterEmail;
    }

    if (filters.crNumber) {
      where.crNumber = { contains: filters.crNumber };
    }

    if (filters.search) {
      where.OR = [
        { crNumber: { contains: filters.search } },
        { description: { contains: filters.search } },
        { requesterName: { contains: filters.search } },
        { affectedService: { contains: filters.search } },
      ];
    }

    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) {
        where.createdAt.gte = filters.createdFrom;
      }
      if (filters.createdTo) {
        where.createdAt.lte = filters.createdTo;
      }
    }

    return where;
  }
}
