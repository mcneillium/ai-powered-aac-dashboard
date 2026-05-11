import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  Box, Button, Chip, FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../contexts/AuthContext';
import { DB_PATHS, getUserDisplayName, getLogUserId, getLogCarerId } from '../shared/schema';
import PageSkeleton from '../components/PageSkeleton';

const PAGE_SIZE = 50;

export default function Logs() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [linkedUserIds, setLinkedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  useEffect(() => {
    get(ref(db, DB_PATHS.USERS)).then(snap => {
      const data = snap.val() || {};
      setAllUsers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    }).catch(() => {});
  }, []);

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

  const userNameMap = useMemo(() => {
    const map = {};
    allUsers.forEach(u => { map[u.id] = getUserDisplayName(u); });
    return map;
  }, [allUsers]);

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map(l => l.action).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const fetchLogs = useCallback(() => {
    if (!isAdmin && (authLoading || !currentUser)) return;
    setLoading(true);
    setError(null);

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
      .catch(() => {
        setLogs([]);
        setError('Failed to load logs.');
      })
      .finally(() => setLoading(false));
  }, [isAdmin, authLoading, currentUser, linkedUserIds]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter && l.action !== actionFilter) return false;
      if (levelFilter !== 'all' && l.level !== levelFilter) return false;
      return true;
    });
  }, [logs, actionFilter, levelFilter]);

  const visibleLogs = useMemo(
    () => filteredLogs.slice(0, displayCount),
    [filteredLogs, displayCount]
  );

  const hasMore = displayCount < filteredLogs.length;

  const handleExport = useCallback(() => {
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
  }, [filteredLogs]);

  if ((authLoading && !isAdmin) || loading) return <PageSkeleton />;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Action Type</InputLabel>
          <Select value={actionFilter} label="Action Type" onChange={e => setActionFilter(e.target.value)}>
            <MenuItem value="">All Actions</MenuItem>
            {actionTypes.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }} size="small">
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
        Showing {visibleLogs.length} of {filteredLogs.length} logs
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>User</strong></TableCell>
              <TableCell><strong>Caregiver</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Level</strong></TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><strong>Session</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleLogs.length > 0 ? (
              visibleLogs.map(log => {
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
                <TableCell colSpan={6} align="center">No logs found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDisplayCount(prev => prev + PAGE_SIZE)}
          >
            Load more ({filteredLogs.length - displayCount} remaining)
          </Button>
        </Box>
      )}
    </Container>
  );
}
