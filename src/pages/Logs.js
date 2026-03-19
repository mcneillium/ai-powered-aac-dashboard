// src/pages/Logs.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Box, Button, Chip, FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../contexts/AuthContext';
import { DB_PATHS, getUserDisplayName, getLogUserId, getLogCarerId } from '../shared/schema';

export default function Logs() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [linkedUserIds, setLinkedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  // Fetch all users for name resolution
  useEffect(() => {
    get(ref(db, DB_PATHS.USERS)).then(snap => {
      const data = snap.val() || {};
      setAllUsers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    }).catch(() => {});
  }, []);

  // For caregivers: fetch linked user IDs
  useEffect(() => {
    if (isAdmin || authLoading || !currentUser) return;
    get(ref(db, DB_PATHS.USERS))
      .then(snap => {
        const data = snap.val() || {};
        const linked = Object.entries(data)
          .filter(([, u]) => u.caregiverId === currentUser.uid)
          .map(([id]) => id);
        setLinkedUserIds(linked);
      })
      .catch(() => setLinkedUserIds([]));
  }, [currentUser, isAdmin, authLoading]);

  // Name map
  const userNameMap = useMemo(() => {
    const map = {};
    allUsers.forEach(u => { map[u.id] = getUserDisplayName(u); });
    return map;
  }, [allUsers]);

  // Unique action types for filter
  const actionTypes = useMemo(() => {
    const set = new Set(logs.map(l => l.action).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const fetchLogs = useCallback(() => {
    if (!isAdmin && (authLoading || !currentUser)) return;
    setLoading(true);

    const logsQuery = query(
      ref(db, DB_PATHS.USER_LOGS),
      orderByChild('timestamp'),
      limitToLast(500)
    );

    get(logsQuery)
      .then(snap => {
        let arr = Object.entries(snap.val() || {})
          .map(([id, log]) => ({ id, ...log }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (!isAdmin) {
          arr = arr.filter(l => {
            const uid = getLogUserId(l);
            return uid && linkedUserIds.includes(uid);
          });
        }
        setLogs(arr);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [isAdmin, authLoading, currentUser, linkedUserIds]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter && l.action !== actionFilter) return false;
      if (levelFilter !== 'all' && l.level !== levelFilter) return false;
      return true;
    });
  }, [logs, actionFilter, levelFilter]);

  // CSV export
  const handleExport = () => {
    const headers = ['Timestamp', 'User', 'Caregiver', 'Action', 'Level', 'Session'];
    const rows = filteredLogs.map(l => [
      l.timestamp ? new Date(l.timestamp).toISOString() : '',
      getLogUserId(l) || '',
      getLogCarerId(l) || '',
      l.action || '',
      l.level || '',
      l.sessionId || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aac-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if ((authLoading && !isAdmin) || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">User Logs</Typography>
        <Box>
          <Button onClick={handleExport} startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
            Export CSV
          </Button>
          <Button onClick={fetchLogs} startIcon={<RefreshIcon />} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Action Type</InputLabel>
          <Select value={actionFilter} label="Action Type" onChange={e => setActionFilter(e.target.value)}>
            <MenuItem value="">All Actions</MenuItem>
            {actionTypes.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Level</InputLabel>
          <Select value={levelFilter} label="Level" onChange={e => setLevelFilter(e.target.value)}>
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="DEBUG">Debug</MenuItem>
            <MenuItem value="INFO">Info</MenuItem>
            <MenuItem value="WARN">Warning</MenuItem>
            <MenuItem value="ERROR">Error</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Showing {filteredLogs.length} of {logs.length} logs
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell><strong>User</strong></TableCell>
              <TableCell><strong>Caregiver</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Level</strong></TableCell>
              <TableCell><strong>Session</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.slice(0, 200).map(log => {
                const uid = getLogUserId(log);
                const cid = getLogCarerId(log);
                return (
                  <TableRow key={log.id}>
                    <TableCell>{uid ? (userNameMap[uid] || uid.slice(0, 8)) : 'N/A'}</TableCell>
                    <TableCell>{cid ? (userNameMap[cid] || cid.slice(0, 8)) : '-'}</TableCell>
                    <TableCell><Chip label={log.action} size="small" /></TableCell>
                    <TableCell>
                      <Chip
                        label={log.level || 'INFO'}
                        size="small"
                        color={
                          log.level === 'ERROR' ? 'error' :
                          log.level === 'WARN' ? 'warning' :
                          log.level === 'DEBUG' ? 'default' : 'info'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {log.sessionId ? log.sessionId.slice(0, 12) : '-'}
                    </TableCell>
                    <TableCell>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">No logs found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
