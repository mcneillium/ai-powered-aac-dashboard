import React, { useEffect, useState } from 'react';
import { ref, onValue, query, orderByChild, limitToLast, off } from 'firebase/database';
import { db } from './firebaseConfig';
import { useAuth } from './contexts/AuthContext';
import { DB_PATHS } from './shared/schema';
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SyncIcon from '@mui/icons-material/Sync';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import FeedbackIcon from '@mui/icons-material/Feedback';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PageSkeleton from './components/PageSkeleton';

function categorizeLog(log) {
  const action = (log.action || '').toLowerCase();
  if (action.includes('login') || action.includes('signup') || action.includes('logged'))
    return { icon: <PersonIcon color="primary" />, category: 'Auth', color: 'primary' };
  if (action.includes('sync') || action.includes('logs_synced'))
    return { icon: <SyncIcon color="success" />, category: 'Sync', color: 'success' };
  if (action.includes('error') || action.includes('fail'))
    return { icon: <WarningIcon color="error" />, category: 'Error', color: 'error' };
  if (action.includes('fine-tun') || action.includes('training') || action.includes('model'))
    return { icon: <ModelTrainingIcon color="secondary" />, category: 'AI', color: 'secondary' };
  if (action.includes('feedback'))
    return { icon: <FeedbackIcon color="info" />, category: 'Feedback', color: 'info' };
  return { icon: <CheckCircleIcon color="action" />, category: 'Activity', color: 'default' };
}

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const { currentUser, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = ref(db, DB_PATHS.USER_LOGS);
    const logsQuery = query(logsRef, orderByChild('timestamp'), limitToLast(50));

    const unsubscribe = onValue(logsQuery, (snap) => {
      const data = snap.val() || {};
      let arr = Object.entries(data)
        .map(([id, log]) => ({ id, ...log }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (!isAdmin && currentUser) {
        arr = arr.filter(
          (l) => l.carerId === currentUser.uid || l.targetUserId === currentUser.uid
        );
      }
      setEvents(arr);
      setLoading(false);
    }, () => { setLoading(false); });
    return () => { off(logsRef); unsubscribe(); };
  }, [isAdmin, currentUser]);

  if (loading) return <PageSkeleton />;

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Recent system events and user activity across the platform.
      </Typography>

      {events.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">No recent notifications.</Typography>
        </Paper>
      ) : (
        <Paper>
          <List disablePadding>
            {events.map((event, idx) => {
              const { icon, category, color } = categorizeLog(event);
              return (
                <React.Fragment key={event.id}>
                  {idx > 0 && <Divider />}
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {event.action}
                          </Typography>
                          <Chip label={category} size="small" color={color} sx={{ height: 20, fontSize: 11 }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {event.carerId && `Carer: ${event.carerId.substring(0, 8)}...`}
                          {event.targetUserId && ` | User: ${event.targetUserId.substring(0, 8)}...`}
                          {' | '}{timeAgo(event.timestamp)}
                        </Typography>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
}
