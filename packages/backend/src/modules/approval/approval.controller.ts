import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../common/decorators';
import { ApprovalService } from './approval.service';

/** JWT payload shape extracted by @CurrentUser() */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/** DTO for post-approve request body */
interface PostApproveDto {
  approverName: string;
  approverPosition?: string;
  reason?: string;
}

/**
 * ApprovalController — REST endpoints for approval management.
 *
 * Provides:
 * - GET /approvals/pending — List CRs pending the current user's approval
 * - POST /approvals/post-approve/:crId — Post-approve emergency CR
 * - GET /approvals/history/:crId — Get approval history for a CR
 */
@ApiTags('Approvals')
@Controller('approvals')
@ApiBearerAuth()
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  /**
   * GET /approvals/pending — List change requests pending the current user's approval.
   */
  @Get('pending')
  @Roles('approver', 'admin')
  @ApiOperation({ summary: 'List pending approvals for current user' })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires approver or admin role' })
  async getPendingApprovals(@CurrentUser() user: JwtPayload) {
    const approvals = await this.approvalService.getPendingApprovals(user.sub);
    return { data: approvals };
  }

  /**
   * POST /approvals/post-approve/:crId — Post-approve an emergency change request.
   * Emergency CRs skip normal approval and must be post-approved before closing.
   */
  @Post('post-approve/:crId')
  @Roles('approver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post-approve an emergency change request' })
  @ApiParam({ name: 'crId', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Emergency CR post-approved successfully' })
  @ApiResponse({ status: 400, description: 'CR is not emergency type or not at correct step' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires approver or admin role' })
  async postApprove(
    @Param('crId') crId: string,
    @Body() body: PostApproveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const approval = await this.approvalService.postApprove(
      crId,
      user.sub,
      body.approverName,
      body.approverPosition,
      body.reason,
    );
    return { data: approval };
  }

  /**
   * GET /approvals/history/:crId — Get approval history for a change request.
   */
  @Get('history/:crId')
  @Roles('approver', 'admin', 'auditor')
  @ApiOperation({ summary: 'Get approval history for a change request' })
  @ApiParam({ name: 'crId', description: 'Change request UUID' })
  @ApiResponse({ status: 200, description: 'Approval history retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires approver, admin, or auditor role' })
  async getApprovalHistory(
    @Param('crId') crId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const history = await this.approvalService.getApprovalHistory(crId);
    return { data: history };
  }
}
