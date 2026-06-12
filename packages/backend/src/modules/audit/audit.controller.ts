import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogSchema } from './dto/query-audit-log.dto';
import { Roles } from '../../common/decorators';

/**
 * AuditController — REST endpoints for querying audit logs.
 * Restricted to Auditor and Admin roles.
 */
@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles('auditor', 'admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit-logs — Search and filter audit logs with pagination.
   */
  @Get()
  @ApiOperation({ summary: 'Search/filter audit logs (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Filter by entity type' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID (UUID)' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action (e.g. create, update, approve)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter to date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit log entries' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 403, description: 'Access denied: insufficient role' })
  async findAll(
    @Query() query: Record<string, unknown>,
  ) {
    const result = QueryAuditLogSchema.safeParse(query);

    if (!result.success) {
      throw new BadRequestException(
        `Invalid query parameters: ${result.error.message}`,
      );
    }

    return this.auditService.findAll(result.data);
  }

  /**
   * GET /audit-logs/entity/:type/:id — Get audit trail for a specific entity.
   */
  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiParam({ name: 'type', description: 'Entity type (e.g. ChangeRequest, User)' })
  @ApiParam({ name: 'id', description: 'Entity ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of audit log entries for the entity' })
  @ApiResponse({ status: 403, description: 'Access denied: insufficient role' })
  async findByEntity(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.auditService.findByEntity(type, id);
  }
}
