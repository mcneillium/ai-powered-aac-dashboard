// src/pages/CaregiverDashboard.js
import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SyncStatusCard from '../components/SyncStatusCard';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { DB_PATHS, getUserDisplayName, getLogUserId } from '../shared/schema';

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.uid) return;
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const filtered = data
        ? Object.entries(data)
            .filter(([, info]) => info.caregiverId === currentUser.uid)
            .map(([uid, info]) => ({ uid, ...info }))
        : [];
      setAssignedUsers(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (assignedUsers.length === 0) return;
    const assignedUids = new Set(assignedUsers.map(u => u.uid));
    get(query(ref(db, DB_PATHS.USER_LOGS), orderByChild('timestamp'), limitToLast(100)))
      .then(snap => {
        const all = Object.entries(snap.val() || {})
          .map(([id, v]) => ({ id, ...v }))
          .filter(l => {
            const uid = getLogUserId(l);
            return uid && assignedUids.has(uid);
          })
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setRecentLogs(all.slice(0, 20));
      })
      .catch(() => setRecentLogs([]));
  }, [assignedUsers]);

  const userNameMap = useMemo(() => {
    const map = {};
    assignedUsers.forEach(u => { map[u.uid] = getUserDisplayName(u); });
    return map;
  }, [assignedUsers]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={48} sx={{ color: '#4CAF50' }} />
      </Box>
    );
  }

  const todayLogs = recentLogs.filter(
    (l) => new Date(l.timestamp).toDateString() === new Date().toDateString()
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Caregiver dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor your assigned users' activity and communication progress.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon sx={{ color: '#4CAF50' }} />
                <Typography variant="body2" color="text.secondary">Assigned users</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{assignedUsers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #2196F3' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ color: '#2196F3' }} />
                <Typography variant="body2" color="text.secondary">Today's activities</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{todayLogs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ color: '#FF9800' }} />
                <Typography variant="body2" color="text.secondary">Total events</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{recentLogs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #9C27B0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: '#9C27B0' }} />
                <Typography variant="body2" color="text.secondary">Active today</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>
                {new Set(todayLogs.map((l) => getLogUserId(l)).filter(Boolean)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Your users</Typography>
          {assignedUsers.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>No users assigned yet.</Typography>
              <Button variant="outlined" onClick={() => navigate('/connect-user')}>
                Connect a user
              </Button>
            </Paper>
          ) : (
            assignedUsers.map((user) => (
              <Paper key={user.uid} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#4CAF50', width: 36, height: 36, fontSize: 14 }}>
                    {(getUserDisplayName(user))[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {getUserDisplayName(user)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/user-actions/${user.uid}`)}
                  >
                    View activity
                  </Button>
                </Box>
                <SyncStatusCard userId={user.uid} />
              </Paper>
            ))
          )}
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Recent activity</Typography>
          <Paper sx={{ maxHeight: 500, overflow: 'auto' }}>
            {recentLogs.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No recent activity.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {recentLogs.slice(0, 15).map((log, idx) => {
                  const uid = getLogUserId(log);
                  return (
                    <React.Fragment key={log.id}>
                      {idx > 0 && <Divider />}
                      <ListItem sx={{ py: 1 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{log.action}</Typography>
                              {uid && userNameMap[uid] && (
                                <Chip label={userNameMap[uid]} size="small" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
