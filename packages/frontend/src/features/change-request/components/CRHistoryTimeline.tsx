import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
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

/** Map audit action to dot color */
function getDotColor(
  action: string,
): 'success' | 'error' | 'info' | 'primary' | 'warning' | 'grey' {
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
      return 'grey';
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
 * Renders a vertical timeline of CR audit history entries.
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
    <Timeline position={compact ? 'right' : 'alternate'} sx={{ p: 0 }}>
      {entries.map((entry, index) => (
        <TimelineItem key={entry.id}>
          {!compact && (
            <TimelineOppositeContent
              sx={{ m: 'auto 0' }}
              variant="body2"
              color="text.secondary"
            >
              {new Date(entry.createdAt).toLocaleDateString('th-TH', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </TimelineOppositeContent>
          )}
          <TimelineSeparator>
            {index > 0 && <TimelineConnector />}
            <TimelineDot color={getDotColor(entry.action)} variant="filled">
              {getActionIcon(entry.action)}
            </TimelineDot>
            {index < entries.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ py: '12px', px: 2 }}>
            <Typography variant="subtitle2" component="span">
              {formatAction(entry.action)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {entry.userEmail}
            </Typography>
            {compact && (
              <Typography variant="caption" color="text.secondary">
                {new Date(entry.createdAt).toLocaleDateString('th-TH', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            )}
            {entry.newValue && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {Object.keys(entry.newValue).length <= 3
                    ? Object.entries(entry.newValue)
                        .map(([key, val]) => `${key}: ${val}`)
                        .join(', ')
                    : `${Object.keys(entry.newValue).length} fields changed`}
                </Typography>
              </Box>
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
