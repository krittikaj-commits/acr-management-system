import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({
  size = 40,
  message,
  fullPage = false,
}: LoadingSpinnerProps): JSX.Element {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 4,
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
