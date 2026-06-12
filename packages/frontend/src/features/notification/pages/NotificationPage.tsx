import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CircleIcon from '@mui/icons-material/Circle';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  useNotificationList,
  useMarkAsRead,
  useMarkAllAsRead,
} from '../hooks/useNotifications';
import { formatTimeAgo } from '../utils/formatTimeAgo';

const PAGE_SIZE = 20;

/**
 * Full page view of all notifications (paginated).
 * Exported as Component for React Router lazy loading.
 */
export function Component(): JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotificationList(page, PAGE_SIZE);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box>
      {/* Header */}
      <Box className="mb-6 flex items-center justify-between">
        <Typography variant="h4">Notifications</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DoneAllIcon />}
          onClick={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending}
        >
          Mark all as read
        </Button>
      </Box>

      {/* Content */}
      <Card>
        {isLoading ? (
          <Box className="flex justify-center py-12">
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box className="flex flex-col items-center py-16">
            <NotificationsNoneIcon
              sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}
            />
            <Typography variant="body1" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    backgroundColor: notification.isRead
                      ? 'transparent'
                      : 'action.hover',
                    py: 2,
                  }}
                  secondaryAction={
                    !notification.isRead ? (
                      <Tooltip title="Mark as read">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => markAsRead.mutate(notification.id)}
                          disabled={markAsRead.isPending}
                        >
                          <DoneIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={
                      <Box className="flex items-center gap-2">
                        {!notification.isRead && (
                          <CircleIcon
                            sx={{ fontSize: 8, color: 'primary.main' }}
                          />
                        )}
                        <Typography
                          variant="body1"
                          fontWeight={notification.isRead ? 400 : 600}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.type}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box className="mt-1">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                        >
                          {notification.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          component="span"
                          sx={{ ml: 2 }}
                        >
                          {formatTimeAgo(notification.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box className="flex justify-center py-4">
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}
