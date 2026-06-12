/**
 * DTO for creating a notification.
 */
export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export type NotificationType =
  | 'cr-submitted'
  | 'cr-assigned'
  | 'cr-approved'
  | 'cr-rejected'
  | 'approval-required'
  | 'implementation-ready'
  | 'verification-required'
  | 'cr-completed'
  | 'approval-link';
