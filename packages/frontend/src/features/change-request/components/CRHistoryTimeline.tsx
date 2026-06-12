import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import HistoryIcon from '@mui/icons-material/History';

import type { IAuditLogEntry } from '@/services/change-request.api';

/** Map audit action to display icon */
function getActionIcon(action: string): JSX.Element {
  switch (action) {
    case 'create':
      return <AddCircleIcon fontSize="small" />;
    case 'update':
      return <EditIcon fontSize="small" />;
    case 'submit':
      return <SendIcon fontSize="small" />;
    case 'approve':
      return <ThumbUpIcon fontSize="small" />;
    case 'reject':
      return <ThumbDownIcon fontSize="small" />;
    case 'complete':
    case 'close':
      return <CheckCircleIcon fontSize="small" />;
    default:
      return <HistoryIcon fontSize="small" />;
  }
}

/** Map audit action to chip color */
function getChipColor(
  action: string,
): 'success' | 'error' | 'info' | 'primary' | 'warning' | 'default' {
  switch (action) {
    case 'create':
      return 'info';
    case 'approve':
    case 'complete':
    case 'close':
      return 'success';
    case 'reject':
      return 'error';
    case 'submit':
      return 'primary';
    case 'update':
      return 'warning';
    default:
      return 'default';
  }
}

/** Format action label for display */
function formatAction(action: string): string {
  const labels: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    submit: 'Submitted',
    approve: 'Approved',
    reject: 'Rejected',
    complete: 'Completed',
    close: 'Closed',
    assign: 'Assigned',
    transition: 'Status Changed',
  };
  return labels[action] ?? action.charAt(0).toUpperCase() + action.slice(1);
}

interface CRHistoryTimelineProps {
  /** Audit log entries sorted by createdAt */
  entries: IAuditLogEntry[];
  /** Whether to show a compact version */
  compact?: boolean;
}

/**
 * Renders a vertical list of CR audit history entries.
 */
export function CRHistoryTimeline({
  entries,
  compact = false,
}: CRHistoryTimelineProps): JSX.Element {
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No history available.
      </Typography>
    );
  }

  return (
    <List sx={{ p: 0, width: '100%' }}>
      {entries.map((entry, index) => (
        <Box key={entry.id}>
          <ListItem alignItems="flex-start" sx={{ px: compact ? 1 : 2 }}>
            <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
              {getActionIcon(entry.action)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box className="flex items-center gap-2 flex-wrap">
                  <Chip
                    label={formatAction(entry.action)}
                    color={getChipColor(entry.action)}
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {entry.userEmail}
                  </Typography>
                </Box>
              }
              secondary={
                <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                  >
                    {new Date(entry.createdAt).toLocaleDateString('th-TH', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                  {entry.newValue && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.25 }}
                    >
                      {Object.keys(entry.newValue).length <= 3
                        ? Object.entries(entry.newValue)
                            .map(([key, val]) => `${key}: ${val}`)
                            .join(', ')
                        : `${Object.keys(entry.newValue).length} fields changed`}
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
          {index < entries.length - 1 && (
            <Divider variant="inset" component="li" />
          )}
        </Box>
      ))}
    </List>
  );
}
