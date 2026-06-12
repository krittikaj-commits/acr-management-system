import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CircleIcon from '@mui/icons-material/Circle';
import { useNavigate } from 'react-router-dom';
import {
  useUnreadCount,
  useNotificationList,
  useMarkAsRead,
  useMarkAllAsRead,
} from '../hooks/useNotifications';
import { useNotificationSocket } from '../hooks/useSocket';
import { formatTimeAgo } from '../utils/formatTimeAgo';

/**
 * Notification bell icon with unread badge.
 * Opens a dropdown popover showing recent notifications.
 */
export function NotificationBell(): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  // Real-time socket connection
  useNotificationSocket();

  // Data hooks
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotificationList(1, 10);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = notificationsData?.data ?? [];

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleViewAll = () => {
    handleClose();
    navigate('/app/notifications');
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label="Notifications"
        size="medium"
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 380, maxHeight: 480 },
          },
        }}
      >
        {/* Header */}
        <Box className="flex items-center justify-between px-4 py-3">
          <Typography variant="h6" fontSize="1rem" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </Box>

        <Divider />

        {/* Notification list */}
        {isLoading ? (
          <Box className="flex justify-center py-8">
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box className="py-8 text-center">
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 340, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItemButton
                key={notification.id}
                onClick={() => {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification.id);
                  }
                }}
                sx={{
                  backgroundColor: notification.isRead
                    ? 'transparent'
                    : 'action.hover',
                }}
              >
                <ListItemText
                  primary={
                    <Box className="flex items-center gap-1">
                      {!notification.isRead && (
                        <CircleIcon
                          sx={{ fontSize: 8, color: 'primary.main' }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight={notification.isRead ? 400 : 600}
                        noWrap
                      >
                        {notification.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="span"
                    >
                      {formatTimeAgo(notification.createdAt)}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}

        <Divider />

        {/* Footer */}
        <Box className="flex justify-center py-2">
          <Button size="small" onClick={handleViewAll}>
            View all notifications
          </Button>
        </Box>
      </Popover>
    </>
  );
}
