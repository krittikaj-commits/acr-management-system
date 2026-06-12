import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { EmailService } from './email/email.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';

/**
 * NotificationModule — Provides notification and email services.
 *
 * Marked as @Global() so any module can inject NotificationService
 * without explicitly importing NotificationModule.
 *
 * Includes WebSocket gateway for real-time notification push via Socket.io.
 */
@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, EmailService, NotificationGateway],
  exports: [NotificationService, NotificationRepository, NotificationGateway],
})
export class NotificationModule {}
