import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const DRAWER_WIDTH = 260;

/**
 * Main application layout for authenticated users.
 * Includes Sidebar + Header + Content area.
 * Wrapped in ProtectedRoute to enforce authentication.
 */
export function MainLayout(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = (): void => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Header
          onToggleSidebar={handleToggleSidebar}
          drawerWidth={sidebarOpen ? DRAWER_WIDTH : 0}
        />
        <Sidebar open={sidebarOpen} width={DRAWER_WIDTH} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8,
            ml: sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
            transition: 'margin-left 0.2s ease',
            backgroundColor: 'background.default',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
