import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, remove, set, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Box, TextField,
  Button, IconButton, Tooltip, Alert
} from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import ArchiveIcon from '@mui/icons-material/Archive';
import InboxIcon from '@mui/icons-material/Inbox';
import { toast } from 'react-hot-toast';
import PageSkeleton from '../components/PageSkeleton';

export default function FeedbackAdmin() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const feedbackRef = ref(db, DB_PATHS.FEEDBACK);
    const unsubscribe = onValue(
      feedbackRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const allFeedback = [];
        Object.entries(data).forEach(([userId, userFeedback]) => {
          if (typeof userFeedback === 'object') {
            Object.entries(userFeedback).forEach(([fbId, fb]) => {
              allFeedback.push({ id: fbId, userId, ...fb });
            });
          }
        });
        allFeedback.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setFeedback(allFeedback);
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Failed to load feedback.');
        setLoading(false);
      }
    );
    return () => { off(feedbackRef); unsubscribe(); };
  }, []);

  const filteredFeedback = useMemo(() => {
    return feedback.filter(fb => {
      if (!fb.timestamp) return !startDate && !endDate;
      const d = new Date(fb.timestamp);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [feedback, startDate, endDate]);

  const handleRespond = useCallback((fb) => {
    if (!fb.email) {
      toast.error('No email address available for this user.');
      return;
    }
    const subject = encodeURIComponent('Re: Your feedback on CommAI');
    const body = encodeURIComponent(
      `Hi ${fb.name || 'there'},\n\nThank you for your feedback:\n"${fb.feedback}"\n\n`
    );
    window.open(`mailto:${fb.email}?subject=${subject}&body=${body}`, '_self');
  }, []);

  const handleArchive = useCallback(async (fb) => {
    try {
      const archiveData = { ...fb };
      delete archiveData.id;
      delete archiveData.userId;
      await set(
        ref(db, `${DB_PATHS.ARCHIVED_FEEDBACK}/${fb.userId}/${fb.id}`),
        archiveData
      );
      await remove(ref(db, `${DB_PATHS.FEEDBACK}/${fb.userId}/${fb.id}`));
      toast.success('Feedback archived.');
    } catch {
      toast.error('Failed to archive feedback.');
    }
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        User feedback
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Feedback submitted from the mobile app by users and caregivers.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="From"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        {(startDate || endDate) && (
          <Button size="small" onClick={() => { setStartDate(''); setEndDate(''); }}>
            Clear
          </Button>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          Showing {filteredFeedback.length} of {feedback.length}
        </Typography>
      </Box>

      {filteredFeedback.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InboxIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">No feedback to show.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Feedback</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFeedback.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell>{fb.name || 'Anonymous'}</TableCell>
                  <TableCell>{fb.email || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={fb.role || 'user'}
                      size="small"
                      color={fb.role === 'caregiver' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400, wordBreak: 'break-word' }}>{fb.feedback}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {fb.timestamp ? new Date(fb.timestamp).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title={fb.email ? 'Reply via email' : 'No email available'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleRespond(fb)}
                            disabled={!fb.email}
                          >
                            <ReplyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Archive">
                        <IconButton size="small" onClick={() => handleArchive(fb)}>
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
