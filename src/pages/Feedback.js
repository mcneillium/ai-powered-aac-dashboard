import React, { useEffect, useState, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Box,
  Button, Chip, Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InboxIcon from '@mui/icons-material/Inbox';
import { Link } from 'react-router-dom';
import { DB_PATHS } from '../shared/schema';
import PageSkeleton from '../components/PageSkeleton';

export default function Feedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await get(ref(db, DB_PATHS.FEEDBACK));
      const data = snap.val() || {};
      const items = [];
      Object.entries(data).forEach(([uid, userFeedback]) => {
        if (typeof userFeedback === 'object') {
          Object.entries(userFeedback).forEach(([fbId, fb]) => {
            items.push({ id: fbId, uid, ...fb });
          });
        }
      });
      items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFeedback(items);
    } catch {
      setFeedback([]);
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  if (loading) return <PageSkeleton />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">User Feedback</Typography>
        <Box>
          <Button onClick={fetchFeedback} startIcon={<RefreshIcon />} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button component={Link} to="/admin" variant="outlined">
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {feedback.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InboxIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">No feedback submitted yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>From</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Feedback</strong></TableCell>
                <TableCell><strong>When</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feedback.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell>{fb.name || 'Anonymous'}</TableCell>
                  <TableCell>{fb.email || '-'}</TableCell>
                  <TableCell>
                    <Chip label={fb.role || 'user'} size="small" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400, wordBreak: 'break-word' }}>
                    {fb.feedback}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {fb.timestamp ? new Date(fb.timestamp).toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
