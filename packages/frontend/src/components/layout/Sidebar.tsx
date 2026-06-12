import { useLocation, useNavigate } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface SidebarProps {
  open: boolean;
  width: number;
}

interface NavItem {
  label: string;
  path: string;
  icon: JSX.Element;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: <DashboardIcon /> },
  { label: 'Change Requests', path: '/app/change-requests', icon: <DescriptionIcon /> },
  { label: 'Approvals', path: '/app/approvals', icon: <CheckCircleIcon /> },
  { label: 'Notifications', path: '/app/notifications', icon: <NotificationsIcon /> },
  { label: 'Audit Logs', path: '/app/audit-logs', icon: <HistoryIcon /> },
  { label: 'Reports', path: '/app/reports', icon: <AssessmentIcon /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Users', path: '/app/admin/users', icon: <PeopleIcon /> },
  { label: 'Master Data', path: '/app/admin/master-data', icon: <SettingsIcon /> },
  { label: 'Workflow Config', path: '/app/admin/workflow', icon: <AccountTreeIcon /> },
];

export function Sidebar({ open, width }: SidebarProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  if (!open) return <></>;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" color="primary" fontWeight={700}>
            DITS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ACR
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {mainNavItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                  borderRight: '3px solid',
                  borderColor: 'primary.main',
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            Administration
          </Typography>
        </ListItem>
        {adminNavItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                  borderRight: '3px solid',
                  borderColor: 'primary.main',
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
