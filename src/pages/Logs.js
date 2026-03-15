// src/pages/Logs.js
import React, { useEffect, useState, useCallback } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../contexts/AuthContext';

export default function Logs() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState([]);
  const [linkedUserIds, setLinkedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // For caregivers: fetch linked user IDs once
  useEffect(() => {
    if (!isAdmin) {
      // wait until authLoading is false
      if (authLoading || !user) return;
      get(ref(db, 'users'))
        .then(snap => {
          const data = snap.val() || {};
          const linked = Object.entries(data)
            .filter(([_, u]) => u.caregiverId === user.uid)
            .map(([id]) => id);
          setLinkedUserIds(linked);
        })
        .catch(() => {
          setLinkedUserIds([]);
        });
    }
  }, [user, isAdmin, authLoading]);

  const fetchLogs = useCallback(() => {
    // Admins fetch immediately; caregivers wait until authLoading & linked IDs ready
    if (!isAdmin && (authLoading || !user)) return;
    setLoading(true);

    const logsQuery = query(
      ref(db, 'userLogs'),
      orderByChild('timestamp'),
      limitToLast(100)
    );

    get(logsQuery)
      .then(snap => {
        let arr = Object.entries(snap.val() || {})
          .map(([id, log]) => ({ id, ...log }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (!isAdmin) {
          arr = arr.filter(l => linkedUserIds.includes(l.userId));
        }
        setLogs(arr);
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAdmin, authLoading, user, linkedUserIds]);

  // Fetch on mount and whenever linkedUserIds updates
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if ((authLoading && !isAdmin) || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">User Logs</Typography>
        <Button
          onClick={fetchLogs}
          startIcon={<RefreshIcon />}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell><strong>User ID</strong></TableCell>
              <TableCell><strong>Log ID</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length > 0 ? (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.userId}</TableCell>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
