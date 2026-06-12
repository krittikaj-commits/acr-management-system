import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export function Component(): JSX.Element {
  return (
    <Box>
      <Typography variant="h4">Audit Logs</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
        Audit log viewer — to be implemented
      </Typography>
    </Box>
  );
}
