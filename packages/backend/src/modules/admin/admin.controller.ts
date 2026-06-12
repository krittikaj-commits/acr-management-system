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
  ApiQuery,
} from '@nestjs/swagger';

import { Roles, CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtPayload } from '../../common/guards/jwt-auth.guard';
import { AdminUserService, PaginatedUsersResult } from './admin-user.service';
import { MasterDataService } from './master-data.service';
import { AdminCreateUserSchema, AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserSchema, AdminUpdateUserDto } from './dto/admin-update-user.dto';
import {
  CreateMasterDataSchema,
  CreateMasterDataDto,
  UpdateMasterDataSchema,
  UpdateMasterDataDto,
} from './dto/master-data.dto';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { MasterData } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly masterDataService: MasterDataService,
  ) {}

  // ─── User Management ──────────────────────────────────────────────────────────

  /**
   * GET /admin/users — List users (paginated).
   */
  @Get('users')
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedUsersResult> {
    return this.adminUserService.listUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search || undefined,
    });
  }

  /**
   * GET /admin/users/:id — Get user by ID.
   */
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.adminUserService.getUserById(id);
  }

  /**
   * POST /admin/users — Create user.
   */
  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @UsePipes(new ZodValidationPipe(AdminCreateUserSchema))
  async createUser(
    @Body() dto: AdminCreateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.adminUserService.createUser(dto, user.sub);
  }

  /**
   * PATCH /admin/users/:id — Update user.
   */
  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminUpdateUserSchema)) dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.adminUserService.updateUser(id, dto);
  }

  /**
   * POST /admin/users/:id/deactivate — Deactivate user.
   */
  @Post('users/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.adminUserService.deactivateUser(id);
  }

  /**
   * POST /admin/users/:id/reactivate — Reactivate user.
   */
  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user' })
  @ApiResponse({ status: 200, description: 'User reactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.adminUserService.reactivateUser(id);
  }

  /**
   * POST /admin/users/:id/assign-role — Assign role to user.
   */
  @Post('users/:id/assign-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async assignRole(
    @Param('id') id: string,
    @Body() body: { roleId: string },
  ): Promise<UserResponseDto> {
    return this.adminUserService.assignRole(id, body.roleId);
  }

  // ─── Master Data Management ────────────────────────────────────────────────────

  /**
   * GET /admin/master-data — List all master data (optional category filter).
   */
  @Get('master-data')
  @ApiOperation({ summary: 'List all master data' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of master data entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async listMasterData(
    @Query('category') category?: string,
  ): Promise<MasterData[]> {
    return this.masterDataService.getAll(category || undefined);
  }

  /**
   * GET /admin/master-data/:id — Get master data by ID.
   */
  @Get('master-data/:id')
  @ApiOperation({ summary: 'Get master data by ID' })
  @ApiResponse({ status: 200, description: 'Master data entry' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Master data not found' })
  async getMasterDataById(@Param('id') id: string): Promise<MasterData> {
    return this.masterDataService.getById(id);
  }

  /**
   * POST /admin/master-data — Create master data entry.
   */
  @Post('master-data')
  @ApiOperation({ summary: 'Create master data entry' })
  @ApiResponse({ status: 201, description: 'Master data created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 409, description: 'Duplicate category+code' })
  @UsePipes(new ZodValidationPipe(CreateMasterDataSchema))
  async createMasterData(@Body() dto: CreateMasterDataDto): Promise<MasterData> {
    return this.masterDataService.create(dto);
  }

  /**
   * PATCH /admin/master-data/:id — Update master data entry.
   */
  @Patch('master-data/:id')
  @ApiOperation({ summary: 'Update master data entry' })
  @ApiResponse({ status: 200, description: 'Master data updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Master data not found' })
  @ApiResponse({ status: 409, description: 'Duplicate category+code' })
  async updateMasterData(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMasterDataSchema)) dto: UpdateMasterDataDto,
  ): Promise<MasterData> {
    return this.masterDataService.update(id, dto);
  }

  /**
   * POST /admin/master-data/:id/disable — Soft-disable master data entry.
   */
  @Post('master-data/:id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable master data entry' })
  @ApiResponse({ status: 200, description: 'Master data disabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Master data not found' })
  async disableMasterData(@Param('id') id: string): Promise<MasterData> {
    return this.masterDataService.disable(id);
  }

  /**
   * POST /admin/master-data/:id/enable — Re-enable master data entry.
   */
  @Post('master-data/:id/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable master data entry' })
  @ApiResponse({ status: 200, description: 'Master data enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Master data not found' })
  async enableMasterData(@Param('id') id: string): Promise<MasterData> {
    return this.masterDataService.enable(id);
  }
}
