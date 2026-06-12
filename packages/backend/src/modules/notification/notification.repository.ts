import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Notification } from '@prisma/client';

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

/**
 * NotificationRepository — Data access layer for notifications.
 */
@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification record.
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  /**
   * Get paginated notifications for a user.
   */
  async findByUserId(userId: string, options?: PaginationOptions): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip ?? 0,
      take: options?.take ?? 20,
    });
  }

  /**
   * Count unread notifications for a user.
   */
  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Find notifications where email sending failed (queued for retry).
   * Looks for notifications with metadata.emailFailed = true.
   */
  async findFailedEmails(): Promise<Notification[]> {
    // Prisma JSON filtering for MSSQL: use string_contains or path filter
    // For MSSQL compatibility, use raw query approach via findMany + filtering
    const notifications = await this.prisma.notification.findMany({
      where: {
        metadata: {
          path: ['emailFailed'],
          equals: true,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return notifications;
  }

  /**
   * Update notification metadata (e.g., clear emailFailed flag after successful retry).
   */
  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { metadata },
    });
  }
}
