// src/pages/FeedbackAdmin.js
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';

export default function FeedbackAdmin() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const feedbackRef = ref(db, 'feedback');
    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      const data = snapshot.val() || {};
      const allFeedback = [];
      Object.entries(data).forEach(([userId, userFeedback]) => {
        Object.entries(userFeedback).forEach(([fbId, fb]) => {
          allFeedback.push({ id: fbId, userId, ...fb });
        });
      });
      allFeedback.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFeedback(allFeedback);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        User feedback
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Feedback submitted from the mobile app by users and caregivers.
      </Typography>

      {feedback.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No feedback submitted yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Feedback</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feedback.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell>{fb.name || 'Anonymous'}</TableCell>
                  <TableCell>{fb.email || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={fb.role || 'user'}
                      size="small"
                      color={fb.role === 'caregiver' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>{fb.feedback}</TableCell>
                  <TableCell>
                    {fb.timestamp ? new Date(fb.timestamp).toLocaleString() : '—'}
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
