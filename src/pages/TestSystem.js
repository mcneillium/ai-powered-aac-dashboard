// src/pages/TestSystem.js
import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Box, TextField, Paper } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { ref, push, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { toast } from 'react-hot-toast';

export default function TestSystem() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [activityText, setActivityText] = useState('');
  const [logs, setLogs] = useState([]);

  // Listen for activity logs related to the current user
  useEffect(() => {
    if (!currentUser) return;
    const logsRef = ref(db, 'userLogs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Filter logs where the userId matches the current user's UID
      const userLogs = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter(log => log.userId === currentUser.uid);
      setLogs(userLogs);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const simulateActivity = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to simulate activity.');
      return;
    }
    try {
      const logRef = ref(db, 'userLogs');
      await push(logRef, {
        userId: currentUser.uid,
        action: activityText || 'Test activity',
        timestamp: Date.now()
      });
      toast.success('Activity logged!');
      setActivityText('');
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error('Error logging activity.');
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Test System
      </Typography>
      <Typography variant="body1" gutterBottom>
        Logged in as: {currentUser ? currentUser.email : 'Not logged in'}
      </Typography>
      <Box sx={{ my: 2 }}>
        <TextField
          label="Activity Description"
          variant="outlined"
          size="small"
          value={activityText}
          onChange={(e) => setActivityText(e.target.value)}
          fullWidth
        />
      </Box>
      <Button variant="contained" onClick={simulateActivity}>
        Simulate Activity
      </Button>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your Activity Logs
        </Typography>
        {logs.length > 0 ? (
          logs.map((log) => (
            <Paper key={log.id} sx={{ p: 2, my: 1 }}>
              <Typography variant="body1">{log.action}</Typography>
              <Typography variant="caption">
                {new Date(log.timestamp).toLocaleString()}
              </Typography>
            </Paper>
          ))
        ) : (
          <Typography variant="body2">No activity logs found.</Typography>
        )}
      </Box>
    </Container>
  );
}
