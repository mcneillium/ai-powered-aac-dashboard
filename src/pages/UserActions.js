// src/pages/UserActions.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, TableContainer, Button, Box, Chip, Card, CardContent, Grid
} from '@mui/material';
import { DB_PATHS, getUserDisplayName, getLogUserId, getLogCarerId } from '../shared/schema';

export default function UserActions() {
  const { userId } = useParams();
  const [logs, setLogs] = useState([]);
  const [userData, setUserData] = useState(null);
  const [allUsers, setAllUsers] = useState({});

  // Fetch user profile
  useEffect(() => {
    get(ref(db, `${DB_PATHS.USERS}/${userId}`)).then(snap => {
      setUserData(snap.val());
    }).catch(() => {});
  }, [userId]);

  // Fetch all users for name resolution
  useEffect(() => {
    get(ref(db, DB_PATHS.USERS)).then(snap => {
      const data = snap.val() || {};
      const map = {};
      Object.entries(data).forEach(([id, u]) => { map[id] = getUserDisplayName(u); });
      setAllUsers(map);
    }).catch(() => {});
  }, []);

  // Listen to logs for this user
  useEffect(() => {
    const logsRef = ref(db, DB_PATHS.USER_LOGS);
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logsArray = Object.entries(data)
        .map(([id, log]) => ({ id, ...log }))
        .filter(log => {
          const uid = getLogUserId(log);
          return uid === userId;
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(logsArray);
    });
    return () => unsubscribe();
  }, [userId]);

  // Compute activity summary
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

      {/* Summary cards */}
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
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Logs table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Caregiver</strong></TableCell>
              <TableCell><strong>Level</strong></TableCell>
              <TableCell><strong>Session</strong></TableCell>
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
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {log.sessionId ? log.sessionId.slice(0, 12) : '-'}
                    </TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
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
