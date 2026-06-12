import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UsePipes,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowValidatorService } from './workflow-validator.service';
import {
  CreateWorkflowDefinitionDto,
  CreateWorkflowDefinitionSchema,
  UpdateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionSchema,
} from './dto';

/**
 * WorkflowController — Admin CRUD endpoints for workflow definitions.
 *
 * All endpoints require admin role. Provides management of workflow
 * definitions including create, update (versioning), activate/deactivate,
 * set-default, and validation.
 */
@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowDefinitionService: WorkflowDefinitionService,
    private readonly workflowValidatorService: WorkflowValidatorService,
  ) {}

  /**
   * GET /workflows — List all workflow definitions (paginated).
   */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all workflow definitions (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'Paginated list of workflow definitions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('isActive') isActive?: string,
  ) {
    const options = {
      page,
      pageSize: limit,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };

    const result = await this.workflowDefinitionService.findAll(options);

    return {
      data: result.data,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
      },
    };
  }

  /**
   * GET /workflows/:id — Get a single workflow definition with steps and conditions.
   */
  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get a workflow definition with steps and conditions' })
  @ApiParam({ name: 'id', description: 'Workflow definition UUID' })
  @ApiResponse({ status: 200, description: 'Workflow definition with steps and conditions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const definition = await this.workflowDefinitionService.findById(id);
    return { data: definition };
  }

  /**
   * POST /workflows — Create a new workflow definition (version 1).
   */
  @Post()
  @Roles('admin')
  @UsePipes(new ZodValidationPipe(CreateWorkflowDefinitionSchema))
  @ApiOperation({ summary: 'Create a new workflow definition' })
  @ApiResponse({ status: 201, description: 'Workflow definition created (version 1)' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async create(
    @Body() dto: CreateWorkflowDefinitionDto,
    @CurrentUser() user: { sub: string },
  ) {
    const definition = await this.workflowDefinitionService.create(dto, user.sub);
    return { data: definition };
  }

  /**
   * PUT /workflows/:id — Update a workflow definition (creates new version).
   */
  @Put(':id')
  @Roles('admin')
  @UsePipes(new ZodValidationPipe(UpdateWorkflowDefinitionSchema))
  @ApiOperation({ summary: 'Update workflow definition (creates new version)' })
  @ApiParam({ name: 'id', description: 'Workflow definition UUID' })
  @ApiResponse({ status: 200, description: 'New version of workflow definition created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ) {
    const definition = await this.workflowDefinitionService.update(id, dto);
    return { data: definition };
  }

  /**
   * POST /workflows/:id/activate — Activate a workflow definition.
   */
  @Post(':id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activate a workflow definition' })
  @ApiParam({ name: 'id', description: 'Workflow definition UUID' })
  @ApiResponse({ status: 200, description: 'Workflow definition activated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    const definition = await this.workflowDefinitionService.activate(id);
    return { data: definition };
  }

  /**
   * POST /workflows/:id/deactivate — Deactivate a workflow definition.
   */
  @Post(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate a workflow definition' })
  @ApiParam({ name: 'id', description: 'Workflow definition UUID' })
  @ApiResponse({ status: 200, description: 'Workflow definition deactivated' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate the only active default' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const definition = await this.workflowDefinitionService.deactivate(id);
    return { data: definition };
  }

  /**
   * POST /workflows/:id/set-default — Set a workflow definition as the default.
   */
  @Post(':id/set-default')
  @Roles('admin')
  @ApiOperation({ summary: 'Set workflow definition as the default for new CRs' })
  @ApiParam({ name: 'id', description: 'Workflow definition UUID' })
  @ApiResponse({ status: 200, description: 'Workflow definition set as default' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async setDefault(@Param('id', ParseUUIDPipe) id: string) {
    const definition = await this.workflowDefinitionService.setDefault(id);
    return { data: definition };
  }

  /**
   * POST /workflows/:id/validate — Validate a workflow definition's integrity.
   */
  @Post(':id/validate')
  @Roles('admin')
  @ApiOperation({ summary: 'Validate workflow definition integrity (steps, conditions, reachability)' })
  @ApiParam({ name: 'id', description: 'Workflow definition UUID' })
  @ApiResponse({ status: 200, description: 'Validation result with errors and warnings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async validate(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.workflowValidatorService.validate(id);
    return { data: result };
  }
}
