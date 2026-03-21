// src/pages/CaregiverDashboard.js
import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Container,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SyncIcon from '@mui/icons-material/Sync';
import SyncStatusCard from '../components/SyncStatusCard';

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const caregiverId = currentUser?.uid;
    if (!caregiverId) return;

    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const filtered = data
        ? Object.entries(data)
            .filter(([, info]) => info.caregiverId === caregiverId)
            .map(([uid, info]) => ({ uid, ...info }))
        : [];
      setAssignedUsers(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch recent logs for assigned users
  useEffect(() => {
    if (!assignedUsers.length) return;
    const userIds = new Set(assignedUsers.map((u) => u.uid));

    const logsQuery = query(
      ref(db, 'userLogs'),
      orderByChild('timestamp'),
      limitToLast(50),
    );
    get(logsQuery).then((snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter((l) => userIds.has(l.targetUserId) || userIds.has(l.userId))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 10);
      setRecentLogs(arr);
    }).catch(() => setRecentLogs([]));
  }, [assignedUsers]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const todayLogs = recentLogs.filter((l) => now - l.timestamp < dayMs);
    return {
      totalUsers: assignedUsers.length,
      todayActivity: todayLogs.length,
    };
  }, [assignedUsers, recentLogs]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">My Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage and monitor your assigned users
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4">{stats.totalUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Assigned Users</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4">{stats.todayActivity}</Typography>
                <Typography variant="body2" color="text.secondary">Today's Activity</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/connect-user')}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SyncIcon sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>Connect Users</Typography>
                <Typography variant="body2" color="text.secondary">Assign unlinked users</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users list */}
      {assignedUsers.length === 0 ? (
        <Alert severity="info" action={
          <Button color="inherit" size="small" onClick={() => navigate('/connect-user')}>
            Connect Users
          </Button>
        }>
          No users assigned yet. Connect to users to start monitoring their activity.
        </Alert>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {assignedUsers.map((user) => (
            <Grid item xs={12} sm={6} key={user.uid}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {user.name || 'Unnamed User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Chip label="Active" size="small" color="success" variant="outlined" />
                </Box>
                <SyncStatusCard userId={user.uid} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Recent Activity</Typography>
            <Button size="small" onClick={() => navigate('/logs')}>View All</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>When</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLogs.map((log) => {
                  const user = assignedUsers.find((u) => u.uid === (log.targetUserId || log.userId));
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell>{user?.name || user?.email || log.userId}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}
