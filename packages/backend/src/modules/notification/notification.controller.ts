import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
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
import { CurrentUser } from '../../common/decorators';
import { NotificationRepository } from './notification.repository';

/** JWT payload shape extracted by @CurrentUser() */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * NotificationController — REST endpoints for user notifications.
 *
 * All endpoints require authentication (JWT Bearer).
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  /**
   * GET /notifications — List notifications for the current user (paginated).
   */
  @Get()
  @ApiOperation({ summary: 'List notifications for the current user (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const notifications = await this.notificationRepository.findByUserId(user!.sub, {
      skip,
      take: limitNum,
    });

    return {
      data: notifications,
      meta: {
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  /**
   * GET /notifications/unread-count — Get unread notification count.
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationRepository.countUnread(user.sub);
    return { data: { unreadCount: count } };
  }

  /**
   * PATCH /notifications/:id/read — Mark a single notification as read.
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const notification = await this.notificationRepository.markAsRead(id);
    return { data: notification };
  }

  /**
   * PATCH /notifications/read-all — Mark all notifications as read for the current user.
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationRepository.markAllAsRead(user.sub);
    return { data: { success: true } };
  }
}
