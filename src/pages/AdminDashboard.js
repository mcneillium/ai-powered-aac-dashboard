// src/pages/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Container, Typography, Paper, Box } from '@mui/material';

export default function AdminDashboard() {
  const [caregivers, setCaregivers] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers');
    const unsubscribe1 = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });

    const logsRef = ref(db, 'userLogs');
    const unsubscribe2 = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setLogs(list);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="h6">Total Caregivers</Typography>
          <Typography variant="h4">{caregivers.length}</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="h6">Total User Logs</Typography>
          <Typography variant="h4">{logs.length}</Typography>
        </Paper>
      </Box>
      {/* You could add more summary statistics or charts here */}
    </Container>
  );
}
