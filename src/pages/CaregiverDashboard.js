import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, List, ListItem,
  ListItemText, Divider, Avatar, Button, Alert, Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SyncStatusCard from '../components/SyncStatusCard';
import PageSkeleton from '../components/PageSkeleton';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CircleIcon from '@mui/icons-material/Circle';
import { DB_PATHS, getUserDisplayName, getLogUserId, LOG_ACTIONS } from '../shared/schema';

const HOUR_MS = 60 * 60 * 1000;

function getActivityStatus(logs, userId) {
  const now = Date.now();
  const userLogs = logs.filter(l => getLogUserId(l) === userId);
  if (userLogs.length === 0) return { color: 'grey', label: 'No data' };
  const latest = Math.max(...userLogs.map(l => l.timestamp || 0));
  const age = now - latest;
  if (age < 4 * HOUR_MS) return { color: '#4CAF50', label: 'Active' };
  if (age < 24 * HOUR_MS) return { color: '#FF9800', label: 'Idle' };
  return { color: '#f44336', label: 'Inactive' };
}

function getUserCommsStats(logs, userId) {
  const userLogs = logs.filter(l => getLogUserId(l) === userId);
  const words = {};
  const emotions = {};
  const sessions = new Set();
  let wordCount = 0;
  let phraseCount = 0;

  userLogs.forEach(l => {
    if (l.sessionId) sessions.add(l.sessionId);
    if (l.action === LOG_ACTIONS.WORD_SPOKEN || l.action === LOG_ACTIONS.ADD_WORD) {
      wordCount++;
      const w = l.word || l.text || l.details;
      if (w) words[w] = (words[w] || 0) + 1;
    }
    if (l.action === LOG_ACTIONS.SENTENCE_SPOKEN) phraseCount++;
    if (l.action === LOG_ACTIONS.EMOTION_SELECTED || l.action === LOG_ACTIONS.EMOTION_SPOKEN) {
      const e = l.emotion || l.details;
      if (e) emotions[e] = (emotions[e] || 0) + 1;
    }
  });

  const topWords = Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  const topEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  return { wordCount, phraseCount, sessions: sessions.size, topWords, topEmotions };
}

const UserCard = React.memo(function UserCard({ user, recentLogs, navigate }) {
  const status = getActivityStatus(recentLogs, user.uid);
  const comms = getUserCommsStats(recentLogs, user.uid);
  const displayName = getUserDisplayName(user);

  return (
    <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
          {displayName[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {displayName}
            </Typography>
            <Tooltip title={status.label}>
              <CircleIcon sx={{ fontSize: 12, color: status.color }} />
            </Tooltip>
            <Chip label={status.label} size="small" sx={{
              bgcolor: status.color, color: '#fff', height: 20, fontSize: 11
            }} />
          </Box>
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

      <Box sx={{ display: 'flex', gap: 3, mt: 1.5, mb: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Words spoken</Typography>
          <Typography variant="h6" fontWeight={600}>{comms.wordCount}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Phrases</Typography>
          <Typography variant="h6" fontWeight={600}>{comms.phraseCount}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Sessions</Typography>
          <Typography variant="h6" fontWeight={600}>{comms.sessions}</Typography>
        </Box>
      </Box>

      {comms.topWords.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Top words: </Typography>
          {comms.topWords.map(w => (
            <Chip key={w} label={w} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
          ))}
        </Box>
      )}
      {comms.topEmotions.length > 0 && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Emotions: </Typography>
          {comms.topEmotions.map(e => (
            <Chip key={e} label={e} size="small" color="primary" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
          ))}
        </Box>
      )}

      <SyncStatusCard userId={user.uid} />
    </Paper>
  );
});

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();
        const filtered = data
          ? Object.entries(data)
              .filter(([, info]) => info.caregiverId === currentUser.uid)
              .map(([uid, info]) => ({ uid, ...info }))
          : [];
        setAssignedUsers(filtered);
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Failed to load users.');
        setLoading(false);
      }
    );
    return () => { off(usersRef); unsubscribe(); };
  }, [currentUser]);

  useEffect(() => {
    if (assignedUsers.length === 0) { setRecentLogs([]); return; }
    const assignedUids = new Set(assignedUsers.map(u => u.uid));
    get(query(ref(db, DB_PATHS.USER_LOGS), orderByChild('timestamp'), limitToLast(200)))
      .then(snap => {
        const all = Object.entries(snap.val() || {})
          .map(([id, v]) => ({ id, ...v }))
          .filter(l => {
            const uid = getLogUserId(l);
            return uid && assignedUids.has(uid);
          })
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setRecentLogs(all);
      })
      .catch(() => setRecentLogs([]));
  }, [assignedUsers]);

  const userNameMap = useMemo(() => {
    const map = {};
    assignedUsers.forEach(u => { map[u.uid] = getUserDisplayName(u); });
    return map;
  }, [assignedUsers]);

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs.filter(l => new Date(l.timestamp).toDateString() === today);
  }, [recentLogs]);

  const activeToday = useMemo(
    () => new Set(todayLogs.map(l => getLogUserId(l)).filter(Boolean)).size,
    [todayLogs]
  );

  const handleNavigate = useCallback((path) => navigate(path), [navigate]);

  if (loading) return <PageSkeleton />;

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Caregiver dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor your assigned users' activity and communication progress.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'success.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon color="success" />
                <Typography variant="body2" color="text.secondary">Assigned users</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{assignedUsers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon color="info" />
                <Typography variant="body2" color="text.secondary">Today's activities</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{todayLogs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon color="warning" />
                <Typography variant="body2" color="text.secondary">Total events</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{recentLogs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid', borderColor: 'secondary.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="secondary" />
                <Typography variant="body2" color="text.secondary">Active today</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>{activeToday}</Typography>
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
              <Button variant="outlined" onClick={() => handleNavigate('/connect-user')}>
                Connect a user
              </Button>
            </Paper>
          ) : (
            assignedUsers.map(user => (
              <UserCard
                key={user.uid}
                user={user}
                recentLogs={recentLogs}
                navigate={navigate}
              />
            ))
          )}
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Recent activity</Typography>
          <Paper sx={{ maxHeight: 600, overflow: 'auto' }}>
            {recentLogs.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No recent activity.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {recentLogs.slice(0, 20).map((log, idx) => {
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
