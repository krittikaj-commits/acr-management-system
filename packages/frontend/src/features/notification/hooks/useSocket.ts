import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { notificationKeys } from './useNotifications';

const SOCKET_URL = import.meta.env.VITE_WS_URL ?? '';

/**
 * Socket.io client hook for real-time notifications.
 * Connects on mount, disconnects on unmount.
 * Invalidates notification queries when a new notification arrives.
 */
export function useNotificationSocket(): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      return;
    }

    const socket = io(SOCKET_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: {
        token: accessToken,
      },
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Connected to notification WebSocket
    });

    socket.on('notification:new', () => {
      // Invalidate React Query cache so UI refreshes
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    socket.on('disconnect', () => {
      // Disconnected from WebSocket
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);
}
