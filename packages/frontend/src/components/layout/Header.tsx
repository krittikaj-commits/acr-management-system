import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { NotificationBell } from '@/features/notification/components/NotificationBell';

interface HeaderProps {
  onToggleSidebar: () => void;
  drawerWidth: number;
}

export function Header({ onToggleSidebar, drawerWidth }: HeaderProps): JSX.Element {
  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        transition: 'width 0.2s ease, margin-left 0.2s ease',
        backgroundColor: 'white',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="toggle sidebar"
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          ACR Management System
        </Typography>
        <NotificationBell />
        <IconButton color="inherit" aria-label="account">
          <AccountCircleIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
