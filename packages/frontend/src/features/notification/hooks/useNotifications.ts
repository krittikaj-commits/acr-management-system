import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface INotification {
  id: string;
  title: string;
  message: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface INotificationListResponse {
  data: INotification[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface IUnreadCountResponse {
  count: number;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (page: number, pageSize: number) =>
    ['notifications', 'list', page, pageSize] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

// ─── API Calls ──────────────────────────────────────────────────────────────

async function fetchNotifications(
  page: number,
  pageSize: number,
): Promise<INotificationListResponse> {
  const response = await api.get<{ data: INotificationListResponse }>(
    '/notifications',
    { params: { page, pageSize } },
  );
  return response.data.data;
}

async function fetchUnreadCount(): Promise<number> {
  const response = await api.get<{ data: IUnreadCountResponse }>(
    '/notifications/unread-count',
  );
  return response.data.data.count;
}

async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

async function markAllAsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook to fetch paginated notifications list.
 */
export function useNotificationList(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: notificationKeys.list(page, pageSize),
    queryFn: () => fetchNotifications(page, pageSize),
  });
}

/**
 * Hook to fetch unread notifications count.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000, // Refetch every 30s as fallback
  });
}

/**
 * Hook to mark a single notification as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to mark all notifications as read.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
