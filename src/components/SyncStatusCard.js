// src/components/SyncStatusCard.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { getDatabase, ref, onValue } from 'firebase/database';

export default function SyncStatusCard({ userId }) {
  const [lastActive, setLastActive] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const db = getDatabase();
    const syncRef = ref(db, `userSync/${userId}`);

    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastActivity) {
        setLastActive(new Date(data.lastActivity).toLocaleString());
      } else {
        setLastActive(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.subtle', borderRadius: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} color="text.primary">
        Last Sync
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={1}>
        {lastActive || 'No activity logged yet'}
      </Typography>
    </Paper>
  );
}
