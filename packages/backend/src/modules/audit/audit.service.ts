import { Injectable, BadRequestException } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAuditLogDto,
  CreateAuditLogSchema,
} from './dto/create-audit-log.dto';
import {
  QueryAuditLogDto,
  PaginatedAuditLogResponse,
} from './dto/query-audit-log.dto';

/**
 * AuditService — append-only service for audit log entries.
 *
 * This service intentionally does NOT expose update or delete methods.
 * Immutability is enforced at both application level (no methods) and
 * database level (SQL trigger prevents UPDATE/DELETE on AuditLog table).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new audit log entry (append-only).
   * Validates input against the CreateAuditLogSchema before persisting.
   *
   * @param entry - The audit log entry data
   * @returns The created AuditLog record
   * @throws BadRequestException if validation fails
   */
  async create(entry: CreateAuditLogDto): Promise<AuditLog> {
    const result = CreateAuditLogSchema.safeParse(entry);

    if (!result.success) {
      throw new BadRequestException(
        `Invalid audit log entry: ${result.error.message}`,
      );
    }

    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        userEmail: entry.userEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue ?? undefined,
        newValue: entry.newValue ?? undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  }

  /**
   * Search and filter audit logs with pagination.
   *
   * @param filters - Query parameters for filtering and pagination
   * @returns Paginated audit log response
   */
  async findAll(filters: QueryAuditLogDto): Promise<PaginatedAuditLogResponse<AuditLog>> {
    const { page, pageSize, entityType, userId, action, startDate, endDate } = filters;

    const where: Prisma.AuditLogWhereInput = {};

    if (entityType) {
      where.entityType = entityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
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
   * Get all audit logs for a specific entity.
   *
   * @param entityType - The type of entity (e.g. 'ChangeRequest', 'User')
   * @param entityId - The UUID of the entity
   * @returns Array of audit log entries for the entity, ordered by newest first
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
