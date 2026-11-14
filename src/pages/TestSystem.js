import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Button, Box, TextField, Paper,
  Grid, Card, CardContent, Chip, CircularProgress, Divider
} from '@mui/material';
import { ref, push, get } from 'firebase/database';
import { db } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { DB_PATHS } from '../shared/schema';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function TestSystem() {
  const { currentUser, userRole, isAdmin } = useAuth();
  const [activityText, setActivityText] = useState('');
  const [dbStatus, setDbStatus] = useState({ status: 'checking', latency: null });
  const [stats, setStats] = useState({ users: null, logs: null, feedback: null });
  const [checking, setChecking] = useState(true);

  const runDiagnostics = useCallback(async () => {
    setChecking(true);

    const start = performance.now();
    try {
      await get(ref(db, DB_PATHS.USERS));
      setDbStatus({ status: 'connected', latency: Math.round(performance.now() - start) });
    } catch {
      setDbStatus({ status: 'error', latency: null });
    }

    try {
      const [usersSnap, logsSnap, feedbackSnap] = await Promise.all([
        get(ref(db, DB_PATHS.USERS)),
        get(ref(db, DB_PATHS.USER_LOGS)),
        get(ref(db, DB_PATHS.FEEDBACK)),
      ]);
      setStats({
        users: usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0,
        logs: logsSnap.exists() ? Object.keys(logsSnap.val()).length : 0,
        feedback: feedbackSnap.exists() ? Object.keys(feedbackSnap.val()).length : 0,
      });
    } catch {
      setStats({ users: '?', logs: '?', feedback: '?' });
    }

    setChecking(false);
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const simulateActivity = async () => {
    if (!currentUser) {
      toast.error('You must be logged in.');
      return;
    }
    try {
      await push(ref(db, DB_PATHS.USER_LOGS), {
        targetUserId: currentUser.uid,
        carerId: currentUser.uid,
        action: activityText || 'Test activity',
        timestamp: Date.now(),
        level: 'DEBUG',
        source: 'dashboard-test',
      });
      toast.success('Activity logged!');
      setActivityText('');
    } catch {
      toast.error('Error logging activity.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">System Diagnostics</Typography>
        <Button
          variant="outlined"
          onClick={runDiagnostics}
          disabled={checking}
          startIcon={checking ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          Re-run checks
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Authentication</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={currentUser ? 'Authenticated' : 'Not authenticated'}
                    color={currentUser ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{currentUser?.email || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">UID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {currentUser?.uid || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                  <Chip
                    label={userRole || 'none'}
                    size="small"
                    color={isAdmin ? 'error' : userRole === 'caregiver' ? 'primary' : 'default'}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Database</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Connectivity</Typography>
                  {checking ? (
                    <CircularProgress size={16} />
                  ) : dbStatus.status === 'connected' ? (
                    <Chip icon={<CheckCircleIcon />} label="Connected" color="success" size="small" />
                  ) : (
                    <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />
                  )}
                </Box>
                {dbStatus.latency != null && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Latency</Typography>
                    <Typography variant="body2">{dbStatus.latency}ms</Typography>
                  </Box>
                )}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Users</Typography>
                  <Typography variant="body2">{stats.users ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Log entries</Typography>
                  <Typography variant="body2">{stats.logs ?? '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Feedback items</Typography>
                  <Typography variant="body2">{stats.feedback ?? '—'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Activity Simulator</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Write a test log entry to verify database write permissions.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Activity description"
            variant="outlined"
            size="small"
            value={activityText}
            onChange={(e) => setActivityText(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Button variant="contained" onClick={simulateActivity}>
            Log activity
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
