import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes';
import { ChangeRequestService } from './change-request.service';
import {
  CreateChangeRequestDto,
  CreateChangeRequestSchema,
} from './dto/create-change-request.dto';
import {
  UpdateChangeRequestDto,
  UpdateChangeRequestSchema,
} from './dto/update-change-request.dto';
import { CRSearchQuerySchema } from './dto/search-query.dto';
import { toChangeRequestResponseDto } from './dto/change-request-response.dto';

/** JWT payload shape extracted by @CurrentUser() */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * ChangeRequestController — REST endpoints for change request lifecycle.
 *
 * Provides CRUD operations and workflow transition endpoints.
 */
@ApiTags('Change Requests')
@Controller('change-requests')
export class ChangeRequestController {
  constructor(private readonly changeRequestService: ChangeRequestService) {}

  // ─── CRUD Endpoints ────────────────────────────────────────────────────────

  /**
   * POST /change-requests — Create a new change request (anonymous allowed).
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateChangeRequestSchema))
  @ApiOperation({ summary: 'Create a new change request (anonymous or authenticated)' })
  @ApiResponse({ status: 201, description: 'Change request created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const cr = await this.changeRequestService.create(dto, user?.sub);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * GET /change-requests — Search/list change requests (paginated, filtered).
   */
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search and list change requests with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of change requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search' })
  @ApiQuery({ name: 'changeType', required: false, enum: ['normal', 'emergency'] })
  @ApiQuery({ name: 'impactLevel', required: false, enum: ['major', 'high', 'medium', 'low', 'very_low'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'crNumber', 'impactLevel', 'changeType'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query(new ZodValidationPipe(CRSearchQuerySchema)) query: any,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.changeRequestService.search(query);
    return {
      data: result.data.map(toChangeRequestResponseDto),
      meta: result.meta,
    };
  }

  /**
   * GET /change-requests/number/:crNumber — Get CR by number (public for tracking).
   */
  @Get('number/:crNumber')
  @Public()
  @ApiOperation({ summary: 'Get change request by CR number (public tracking)' })
  @ApiParam({ name: 'crNumber', description: 'CR number (e.g. CR-2026-0001)' })
  @ApiResponse({ status: 200, description: 'Change request found' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async findByCrNumber(@Param('crNumber') crNumber: string) {
    const cr = await this.changeRequestService.findByCrNumber(crNumber);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * GET /change-requests/:id — Get CR by ID (authenticated).
   */
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get change request by ID' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.findById(id);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * PATCH /change-requests/:id — Update CR fields (authenticated).
   */
  @Patch(':id')
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateChangeRequestSchema))
  @ApiOperation({ summary: 'Update change request fields' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request updated' })
  @ApiResponse({ status: 400, description: 'Validation error or fields not allowed at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  @ApiResponse({ status: 409, description: 'Version conflict (optimistic locking)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChangeRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.update(id, dto, user.sub);
    return { data: toChangeRequestResponseDto(cr) };
  }

  // ─── Workflow Transition Endpoints ─────────────────────────────────────────

  /**
   * POST /change-requests/:id/submit — Submit CR (authenticated or token-based).
   */
  @Post(':id/submit')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit change request for processing' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request submitted' })
  @ApiResponse({ status: 400, description: 'Cannot submit at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.submit(id, user?.sub);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/assign — Assign CR to IT reviewer.
   */
  @Post(':id/assign')
  @ApiBearerAuth()
  @Roles('call_center', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign change request to IT reviewer' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request assigned' })
  @ApiResponse({ status: 400, description: 'Cannot assign at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires call_center or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async assign(
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.assign(id, body.assignedToId, user.sub);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/submit-for-approval — Submit CR for approval.
   */
  @Post(':id/submit-for-approval')
  @ApiBearerAuth()
  @Roles('it_reviewer', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit change request for approval' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request submitted for approval' })
  @ApiResponse({ status: 400, description: 'Cannot submit for approval — missing required fields or wrong step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires it_reviewer or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async submitForApproval(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.submitForApproval(id, user.sub);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/approve — Approve CR.
   */
  @Post(':id/approve')
  @ApiBearerAuth()
  @Roles('approver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve change request' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request approved' })
  @ApiResponse({ status: 400, description: 'Cannot approve at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires approver or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async approve(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.approve(id, user.sub, body.reason);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/reject — Reject CR.
   */
  @Post(':id/reject')
  @ApiBearerAuth()
  @Roles('approver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject change request' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request rejected' })
  @ApiResponse({ status: 400, description: 'Cannot reject at current step or missing reason' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires approver or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.reject(id, user.sub, body.reason);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/implement — Record implementation details.
   */
  @Post(':id/implement')
  @ApiBearerAuth()
  @Roles('implementer', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record change request implementation' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Implementation recorded' })
  @ApiResponse({ status: 400, description: 'Cannot implement at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires implementer or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async implement(
    @Param('id') id: string,
    @Body() body: { notes: string; versionBefore?: string; versionAfter?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.implement(
      id,
      user.sub,
      body.notes,
      body.versionBefore,
      body.versionAfter,
    );
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/verify — Verify after implementation.
   */
  @Post(':id/verify')
  @ApiBearerAuth()
  @Roles('it_reviewer', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify change request implementation' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Verification result recorded' })
  @ApiResponse({ status: 400, description: 'Cannot verify at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires it_reviewer or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async verify(
    @Param('id') id: string,
    @Body() body: { result: 'success' | 'failed' },
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.verify(id, user.sub, body.result);
    return { data: toChangeRequestResponseDto(cr) };
  }

  /**
   * POST /change-requests/:id/close — Close CR.
   */
  @Post(':id/close')
  @ApiBearerAuth()
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close change request' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Change request closed' })
  @ApiResponse({ status: 400, description: 'Cannot close at current step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async close(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const cr = await this.changeRequestService.close(id, user.sub, body.reason);
    return { data: toChangeRequestResponseDto(cr) };
  }

  // ─── Audit / History ───────────────────────────────────────────────────────

  /**
   * GET /change-requests/:id/history — Get CR audit trail.
   */
  @Get(':id/history')
  @ApiBearerAuth()
  @Roles('auditor', 'admin')
  @ApiOperation({ summary: 'Get change request audit trail / history' })
  @ApiParam({ name: 'id', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Audit trail retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires auditor or admin role' })
  @ApiResponse({ status: 404, description: 'Change request not found' })
  async getHistory(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const history = await this.changeRequestService.getHistory(id);
    return { data: history };
  }
}
