import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export function PublicLayout(): JSX.Element {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        component="header"
        sx={{
          py: 2,
          px: 3,
          backgroundColor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" color="primary" fontWeight={700}>
          DITS ACR Management System
        </Typography>
      </Box>
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Container>
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'white',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Dynamic IT Solution (DITS). All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
