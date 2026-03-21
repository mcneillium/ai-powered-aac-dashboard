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
  Button,
  Chip,
  TablePagination,
  TextField,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../contexts/AuthContext';

export default function Logs() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState([]);
  const [linkedUserIds, setLinkedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // For caregivers: fetch linked user IDs
  useEffect(() => {
    if (isAdmin || authLoading || !currentUser) return;
    get(ref(db, 'users'))
      .then((snap) => {
        const data = snap.val() || {};
        const linked = Object.entries(data)
          .filter(([, u]) => u.caregiverId === currentUser.uid)
          .map(([id]) => id);
        setLinkedUserIds(linked);
      })
      .catch(() => setLinkedUserIds([]));
  }, [currentUser, isAdmin, authLoading]);

  const fetchLogs = useCallback(() => {
    if (!isAdmin && (authLoading || !currentUser)) return;
    setLoading(true);

    get(query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(500)))
      .then((snap) => {
        let arr = Object.entries(snap.val() || {})
          .map(([id, log]) => ({ id, ...log }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (!isAdmin) {
          arr = arr.filter((l) =>
            linkedUserIds.includes(l.userId) || linkedUserIds.includes(l.targetUserId),
          );
        }
        setLogs(arr);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [isAdmin, authLoading, currentUser, linkedUserIds]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = logs.filter((l) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (l.action || '').toLowerCase().includes(s)
      || (l.userId || '').toLowerCase().includes(s)
      || (l.targetUserId || '').toLowerCase().includes(s);
  });

  if ((authLoading && !isAdmin) || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Activity Logs</Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredLogs.length} entries
          </Typography>
        </Box>
        <Button onClick={fetchLogs} startIcon={<RefreshIcon />} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <TextField
        placeholder="Search by action, user ID..."
        size="small"
        fullWidth
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
      />

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User ID</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Performed By</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">{log.targetUserId || log.userId || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {log.carerId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No logs found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredLogs.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Paper>
    </Container>
  );
}
