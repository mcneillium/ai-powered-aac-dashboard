import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, update, get, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, ToggleButton, ToggleButtonGroup,
  List, ListItem, ListItemText, ListItemIcon, Divider, Alert, Avatar
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import PageSkeleton from '../components/PageSkeleton';
import { DB_PATHS, ALERT_TYPES, getUserDisplayName } from '../shared/schema';

const ALERT_META = {
  [ALERT_TYPES.DISTRESS]: { color: 'error', icon: <WarningAmberIcon />, label: 'Distress' },
  [ALERT_TYPES.INACTIVITY]: { color: 'warning', icon: <AccessTimeIcon />, label: 'Inactivity' },
  [ALERT_TYPES.VOCAB_GAP]: { color: 'info', icon: <PsychologyIcon />, label: 'Vocab gap' },
};

export default function Alerts() {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    get(ref(db, DB_PATHS.USERS)).then(snap => {
      const data = snap.val() || {};
      const map = {};
      Object.entries(data).forEach(([id, u]) => { map[id] = getUserDisplayName(u); });
      setUserMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const alertPath = isAdmin
      ? DB_PATHS.ALERTS
      : `${DB_PATHS.ALERTS}/${currentUser.uid}`;
    const alertsRef = ref(db, alertPath);

    const unsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const all = [];
        if (isAdmin) {
          Object.entries(data).forEach(([cgId, cgAlerts]) => {
            if (typeof cgAlerts === 'object') {
              Object.entries(cgAlerts).forEach(([id, a]) => {
                all.push({ id, caregiverId: cgId, ...a });
              });
            }
          });
        } else {
          Object.entries(data).forEach(([id, a]) => {
            all.push({ id, caregiverId: currentUser.uid, ...a });
          });
        }
        all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAlerts(all);
        setLoading(false);
        setError(null);
      },
      () => { setError('Failed to load alerts.'); setLoading(false); }
    );
    return () => { off(alertsRef); unsubscribe(); };
  }, [currentUser, isAdmin]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (statusFilter === 'unread' && a.read) return false;
      if (statusFilter === 'read' && !a.read) return false;
      return true;
    });
  }, [alerts, typeFilter, statusFilter]);

  const unreadCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);

  const handleMarkRead = useCallback(async (alert) => {
    try {
      await update(
        ref(db, `${DB_PATHS.ALERTS}/${alert.caregiverId}/${alert.id}`),
        { read: true }
      );
    } catch {}
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const unread = alerts.filter(a => !a.read);
    const updates = {};
    unread.forEach(a => {
      updates[`${DB_PATHS.ALERTS}/${a.caregiverId}/${a.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
      try { await update(ref(db), updates); } catch {}
    }
  }, [alerts]);

  if (loading) return <PageSkeleton />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" fontWeight={600}>Alerts</Typography>
        {unreadCount > 0 && (
          <Button
            startIcon={<MarkEmailReadIcon />}
            onClick={handleMarkAllRead}
            variant="outlined"
            size="small"
          >
            Mark all read ({unreadCount})
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Real-time alerts from the mobile app — distress signals, inactivity, and vocabulary gaps.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={(_, v) => v && setTypeFilter(v)}
          size="small"
        >
          <ToggleButton value="all">All types</ToggleButton>
          <ToggleButton value={ALERT_TYPES.DISTRESS}>Distress</ToggleButton>
          <ToggleButton value={ALERT_TYPES.INACTIVITY}>Inactivity</ToggleButton>
          <ToggleButton value={ALERT_TYPES.VOCAB_GAP}>Vocab gap</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, v) => v && setStatusFilter(v)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
          <ToggleButton value="read">Read</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {filteredAlerts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">No alerts to show.</Typography>
        </Paper>
      ) : (
        <Paper>
          <List disablePadding>
            {filteredAlerts.map((alert, idx) => {
              const meta = ALERT_META[alert.type] || ALERT_META[ALERT_TYPES.INACTIVITY];
              const userName = alert.userId ? (userMap[alert.userId] || alert.userId.slice(0, 8)) : 'Unknown';
              return (
                <React.Fragment key={`${alert.caregiverId}-${alert.id}`}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{
                      bgcolor: alert.read ? 'transparent' : 'action.hover',
                      py: 1.5,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (!alert.read) handleMarkRead(alert);
                      if (alert.userId) navigate(`/user-actions/${alert.userId}`);
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={meta.label}
                          size="small"
                          color={meta.color}
                          variant={alert.read ? 'outlined' : 'filled'}
                        />
                        {!alert.read && (
                          <Button
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleMarkRead(alert); }}
                          >
                            Mark read
                          </Button>
                        )}
                      </Box>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${meta.color}.main`,
                          width: 32,
                          height: 32,
                        }}
                      >
                        {React.cloneElement(meta.icon, { sx: { fontSize: 18, color: '#fff' } })}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={alert.read ? 400 : 600}>
                          {alert.trigger || `${meta.label} alert`}
                        </Typography>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            User: {userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '-'}
                          </Typography>
                        </Box>
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
