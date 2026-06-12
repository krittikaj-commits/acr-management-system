import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';

interface RoleGuardProps {
  /** Required role(s) — user must have at least one of these */
  allowedRoles: string[];
  children: ReactNode;
}

/**
 * Temporary role getter — returns user's role from localStorage.
 * Will be replaced with actual auth store in a later task.
 */
function useUserRole(): string | null {
  // TODO: Connect to Zustand auth store
  // const { user } = useAuthStore();
  // return user?.role ?? null;
  return localStorage.getItem('userRole');
}

/**
 * Role-based access guard.
 * Checks if the current user has the required role.
 * If not, displays an "Access Denied" message instead of the children.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps): JSX.Element {
  const userRole = useUserRole();
  const navigate = useNavigate();

  const hasAccess = userRole !== null && allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          p: 4,
          textAlign: 'center',
        }}
        role="alert"
      >
        <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          ไม่มีสิทธิ์เข้าถึง
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480 }}>
          คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่มเติม
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/app/dashboard')}>
          กลับหน้าหลัก
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
