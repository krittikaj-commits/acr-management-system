import Chip, { ChipProps } from '@mui/material/Chip';

/** Maps workflow step names to display colors */
const STATUS_COLOR_MAP: Record<string, ChipProps['color']> = {
  Draft: 'default',
  Submitted: 'info',
  'IT Review': 'warning',
  Approval: 'secondary',
  Implementation: 'primary',
  Verification: 'info',
  Closed: 'success',
  Cancelled: 'error',
};

interface CRStatusBadgeProps {
  /** Current workflow step name or workflow status */
  status: string;
  /** Optional size variant */
  size?: 'small' | 'medium';
}

/**
 * Renders a colored MUI Chip indicating the current CR workflow step.
 */
export function CRStatusBadge({
  status,
  size = 'small',
}: CRStatusBadgeProps): JSX.Element {
  const color = STATUS_COLOR_MAP[status] ?? 'default';

  return (
    <Chip
      label={status}
      color={color}
      size={size}
      variant="filled"
      sx={{ fontWeight: 500 }}
    />
  );
}
