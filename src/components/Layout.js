// src/components/Layout.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  useMediaQuery,
  useTheme,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LinkIcon from '@mui/icons-material/Link';
import BarChartIcon from '@mui/icons-material/BarChart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BugReportIcon from '@mui/icons-material/BugReport';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FeedbackIcon from '@mui/icons-material/Feedback';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';

const DRAWER_WIDTH = 260;

const adminNav = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'User management', path: '/user-management', icon: <PeopleIcon /> },
  { label: 'Caregiver management', path: '/caregivers', icon: <GroupWorkIcon /> },
  { label: 'Logs', path: '/logs', icon: <ListAltIcon /> },
  { label: 'Fine-tune metrics', path: '/finetune-metrics', icon: <ModelTrainingIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
  { label: 'Feedback', path: '/feedback-admin', icon: <FeedbackIcon /> },
  { label: 'System settings', path: '/system-settings', icon: <SettingsIcon /> },
  { label: 'Test system', path: '/test-system', icon: <BugReportIcon /> },
];

const caregiverNav = [
  { label: 'Dashboard', path: '/caregiver', icon: <DashboardIcon /> },
  { label: 'My users', path: '/my-users', icon: <PeopleIcon /> },
  { label: 'Connect user', path: '/connect-user', icon: <LinkIcon /> },
  { label: 'Logs', path: '/logs', icon: <ListAltIcon /> },
  { label: 'Fine-tune metrics', path: '/finetune-metrics', icon: <ModelTrainingIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
];

export default function Layout({ children }) {
  const { currentUser, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin ? adminNav : caregiverNav;

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const initials = currentUser?.email
    ? currentUser.email.substring(0, 2).toUpperCase()
    : '?';

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#4CAF50', width: 36, height: 36, fontSize: 14 }}>
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

      {/* Navigation */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton
                selected={active}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(76, 175, 80, 0.12)',
                    '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.18)' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#4CAF50' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#4CAF50' : 'inherit',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />
      {/* Logout */}
      <List sx={{ pb: 1 }}>
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
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            bgcolor: '#fff',
            color: '#333',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600, color: '#4CAF50' }}>
              CommAI Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
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
                borderRight: '1px solid rgba(0,0,0,0.08)',
              },
            }}
            open
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                CommAI
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 400, color: '#666' }}>
                Dashboard
              </Typography>
            </Box>
            <Divider />
            {drawerContent}
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: isMobile ? '64px' : 0,
          bgcolor: '#f8f9fa',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
