import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Avatar,
  Chip,
  Badge,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LinkIcon from '@mui/icons-material/Link';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BugReportIcon from '@mui/icons-material/BugReport';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FeedbackIcon from '@mui/icons-material/Feedback';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import StarIcon from '@mui/icons-material/Star';

const DRAWER_WIDTH = 260;

const adminNav = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'User management', path: '/user-management', icon: <PeopleIcon /> },
  { label: 'Caregiver management', path: '/caregivers', icon: <GroupWorkIcon /> },
  { label: 'Custom boards', path: '/custom-boards', icon: <ViewModuleIcon /> },
  { label: 'Favorites', path: '/favorites', icon: <StarIcon /> },
  { label: 'Alerts', path: '/alerts', icon: <NotificationsActiveIcon />, badgeKey: 'alerts' },
  { label: 'Logs', path: '/logs', icon: <ListAltIcon /> },
  { label: 'Fine-tune metrics', path: '/finetune-metrics', icon: <ModelTrainingIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
  { label: 'Feedback', path: '/feedback-admin', icon: <FeedbackIcon /> },
  { label: 'System settings', path: '/system-settings', icon: <SettingsIcon /> },
  { label: 'Diagnostics', path: '/test-system', icon: <BugReportIcon /> },
];

const caregiverNav = [
  { label: 'Dashboard', path: '/caregiver', icon: <DashboardIcon /> },
  { label: 'My users', path: '/my-users', icon: <PeopleIcon /> },
  { label: 'Connect user', path: '/connect-user', icon: <LinkIcon /> },
  { label: 'Custom boards', path: '/custom-boards', icon: <ViewModuleIcon /> },
  { label: 'Favorites', path: '/favorites', icon: <StarIcon /> },
  { label: 'Alerts', path: '/alerts', icon: <NotificationsActiveIcon />, badgeKey: 'alerts' },
  { label: 'Logs', path: '/logs', icon: <ListAltIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
];

export default function Layout({ children }) {
  const { currentUser, isAdmin, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const alertPath = isAdmin
      ? DB_PATHS.ALERTS
      : `${DB_PATHS.ALERTS}/${currentUser.uid}`;
    const dbRef = ref(db, alertPath);

    const handleSnapshot = (snap) => {
      const data = snap.val() || {};
      let count = 0;
      if (isAdmin) {
        Object.values(data).forEach(cgAlerts => {
          if (typeof cgAlerts === 'object') {
            Object.values(cgAlerts).forEach(a => { if (!a.read) count++; });
          }
        });
      } else {
        Object.values(data).forEach(a => { if (!a.read) count++; });
      }
      setUnreadAlerts(count);
    };

    const unsubscribe = onValue(dbRef, handleSnapshot, () => {});
    return () => { off(dbRef); unsubscribe(); };
  }, [currentUser, isAdmin]);

  const navItems = isAdmin ? adminNav : caregiverNav;

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }, [signOut, navigate]);

  const initials = currentUser?.email
    ? currentUser.email.substring(0, 2).toUpperCase()
    : '?';

  const handleNavClick = useCallback((path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  }, [navigate, isMobile]);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
          {initials}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {currentUser?.email || 'User'}
          </Typography>
          <Chip
            label={isAdmin ? 'Admin' : 'Caregiver'}
            size="small"
            color={isAdmin ? 'error' : 'primary'}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Box>
      </Box>
      <Divider />

      <List sx={{ flex: 1, pt: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton
                selected={active}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '&:hover': { bgcolor: 'action.hover' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'inherit' }}>
                  {item.badgeKey === 'alerts' && unreadAlerts > 0 ? (
                    <Badge badgeContent={unreadAlerts} color="error" max={99}>
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'primary.main' : 'inherit',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />
      <List sx={{ pb: 1 }}>
        <ListItem disablePadding sx={{ px: 1 }}>
          <ListItemButton onClick={toggleTheme} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText
              primary={mode === 'dark' ? 'Light mode' : 'Dark mode'}
              primaryTypographyProps={{ fontSize: 14 }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding sx={{ px: 1 }}>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Log out" primaryTypographyProps={{ fontSize: 14 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 1,
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600, color: 'primary.main' }}>
              CommAI Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                borderRight: 1,
                borderColor: 'divider',
              },
            }}
            open
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                CommAI
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                Dashboard
              </Typography>
            </Box>
            <Divider />
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: isMobile ? '64px' : 0,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
