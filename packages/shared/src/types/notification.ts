import type { NotificationType } from '../constants/index.js';

/** Notification entity interface */
export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}
