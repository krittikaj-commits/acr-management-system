import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationRepository } from './notification.repository';
import { EmailService } from './email/email.service';
import { renderEmailTemplate } from './email/templates';
import { NotificationType } from './dto';
import { RedisService } from '../redis/redis.service';

/**
 * NotificationService — Orchestrates in-app notifications and email delivery.
 *
 * - Store in-app notification (Prisma Notification model)
 * - Send email via SES
 * - Publish to Redis pub/sub for real-time WebSocket push
 * - On email failure: store in retry queue (set metadata.emailFailed = true)
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Send a notification to a user (in-app + email).
   *
   * @param type - Notification type (determines template)
   * @param userId - Target user ID
   * @param metadata - Template data and additional context
   */
  async notify(
    type: NotificationType,
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // Resolve user email from userId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      this.logger.warn(`User not found for notification: ${userId}`);
      return;
    }

    // Render email template
    const template = renderEmailTemplate(type, metadata);
    const title = template?.subject ?? `Notification: ${type}`;
    const message = template?.html ?? '';

    // Store in-app notification
    const notification = await this.notificationRepository.create({
      userId,
      type,
      title,
      message: title, // Store subject as message for in-app display
      metadata,
    });

    // Publish to Redis for real-time WebSocket push
    await this.publishToRedis(userId, {
      id: notification.id,
      type,
      title,
      message: title,
      metadata,
      createdAt: new Date().toISOString(),
    });

    // Send email
    if (template) {
      try {
        await this.emailService.sendEmail(user.email, template.subject, template.html);
      } catch (error) {
        this.logger.error(
          `Email failed for notification ${notification.id}: ${(error as Error).message}`,
        );
        // Queue for retry by marking in metadata
        await this.notificationRepository.updateMetadata(notification.id, {
          ...metadata,
          emailFailed: true,
          emailTo: user.email,
        });
      }
    }
  }

  /**
   * Send an email-only notification (no user account needed).
   * Used for anonymous notifications like approval links.
   *
   * @param type - Notification type
   * @param email - Target email address
   * @param metadata - Template data
   */
  async notifyByEmail(
    type: NotificationType,
    email: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const template = renderEmailTemplate(type, metadata);

    if (!template) {
      this.logger.warn(`No template found for notification type: ${type}`);
      return;
    }

    try {
      await this.emailService.sendEmail(email, template.subject, template.html);
    } catch (error) {
      this.logger.error(
        `Email-only notification failed for ${email}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Retry sending emails that previously failed.
   * Queries notifications with emailFailed flag and attempts to re-send.
   */
  async retryFailedEmails(): Promise<{ retried: number; failed: number }> {
    const failedNotifications = await this.notificationRepository.findFailedEmails();
    let retried = 0;
    let failed = 0;

    for (const notification of failedNotifications) {
      const meta = notification.metadata as Record<string, unknown> | null;
      if (!meta) continue;

      const emailTo = meta.emailTo as string | undefined;
      const type = notification.type as NotificationType;

      if (!emailTo) {
        failed++;
        continue;
      }

      const template = renderEmailTemplate(type, meta);
      if (!template) {
        failed++;
        continue;
      }

      try {
        await this.emailService.sendEmail(emailTo, template.subject, template.html);
        // Clear emailFailed flag on success
        const { emailFailed, emailTo: _, ...cleanMeta } = meta;
        await this.notificationRepository.updateMetadata(notification.id, cleanMeta);
        retried++;
      } catch (error) {
        this.logger.error(
          `Retry failed for notification ${notification.id}: ${(error as Error).message}`,
        );
        failed++;
      }
    }

    this.logger.log(`Retry complete: ${retried} retried, ${failed} failed`);
    return { retried, failed };
  }

  /**
   * Publish notification payload to Redis pub/sub channel.
   * Channel format: notifications:{userId}
   * Allows horizontal scaling — other backend instances' WebSocket gateways
   * will receive the notification and push to connected clients.
   */
  private async publishToRedis(userId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.publish(`notifications:${userId}`, JSON.stringify(payload));
    } catch (error) {
      // Non-critical — in-app notification is already stored.
      // WebSocket push is best-effort; client can poll for missed notifications.
      this.logger.warn(
        `Failed to publish notification to Redis for user ${userId}: ${(error as Error).message}`,
      );
    }
  }
}
