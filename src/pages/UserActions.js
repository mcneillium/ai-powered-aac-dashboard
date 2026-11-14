import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, onValue, get, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, TableContainer, Button, Box, Chip, Card, CardContent, Grid, Alert
} from '@mui/material';
import { DB_PATHS, getUserDisplayName, getLogUserId, getLogCarerId } from '../shared/schema';
import PageSkeleton from '../components/PageSkeleton';

export default function UserActions() {
  const { userId } = useParams();
  const [logs, setLogs] = useState([]);
  const [userData, setUserData] = useState(null);
  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    get(ref(db, `${DB_PATHS.USERS}/${userId}`))
      .then(snap => setUserData(snap.val()))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    get(ref(db, DB_PATHS.USERS)).then(snap => {
      const data = snap.val() || {};
      const map = {};
      Object.entries(data).forEach(([id, u]) => { map[id] = getUserDisplayName(u); });
      setAllUsers(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const logsRef = ref(db, DB_PATHS.USER_LOGS);
    const unsubscribe = onValue(
      logsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const logsArray = Object.entries(data)
          .map(([id, log]) => ({ id, ...log }))
          .filter(log => getLogUserId(log) === userId)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLogs(logsArray);
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Failed to load activity logs.');
        setLoading(false);
      }
    );
    return () => { off(logsRef); unsubscribe(); };
  }, [userId]);

  const summary = useMemo(() => {
    const actionCounts = {};
    logs.forEach(l => {
      const action = l.action || 'Unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });
    const today = new Date().toDateString();
    const todayCount = logs.filter(l => new Date(l.timestamp).toDateString() === today).length;
    return { actionCounts, todayCount, totalCount: logs.length };
  }, [logs]);

  if (loading) return <PageSkeleton />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">
            Activity: {userData ? getUserDisplayName(userData) : userId.slice(0, 8)}
          </Typography>
          {userData?.email && (
            <Typography variant="body2" color="text.secondary">{userData.email}</Typography>
          )}
        </Box>
        <Button component={Link} to="/user-management" variant="outlined">
          Back to Users
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item md={3} xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Actions</Typography>
              <Typography variant="h4">{summary.totalCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={3} xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Today</Typography>
              <Typography variant="h4">{summary.todayCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={6} xs={12}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Action Breakdown</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(summary.actionCounts).map(([action, count]) => (
                  <Chip key={action} label={`${action}: ${count}`} size="small" />
                ))}
                {Object.keys(summary.actionCounts).length === 0 && (
                  <Typography variant="body2" color="text.secondary">No actions recorded</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Caregiver</strong></TableCell>
              <TableCell><strong>Level</strong></TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><strong>Session</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => {
                const cid = getLogCarerId(log);
                return (
                  <TableRow key={log.id}>
                    <TableCell><Chip label={log.action} size="small" /></TableCell>
                    <TableCell>{cid ? (allUsers[cid] || cid.slice(0, 8)) : '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.level || 'INFO'}
                        size="small"
                        color={
                          log.level === 'ERROR' ? 'error' :
                          log.level === 'WARN' ? 'warning' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, display: { xs: 'none', md: 'table-cell' } }}>
                      {log.sessionId ? log.sessionId.slice(0, 12) : '-'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">No actions found for this user.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
