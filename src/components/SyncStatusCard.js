// src/components/SyncStatusCard.js
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import SyncIcon from '@mui/icons-material/Sync';
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled';

export default function SyncStatusCard({ userId }) {
  const [lastActive, setLastActive] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const syncRef = ref(db, `userSync/${userId}`);

    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastActivity) {
        setLastActive(new Date(data.lastActivity));
      } else {
        setLastActive(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const isRecent = lastActive && (Date.now() - lastActive.getTime()) < 24 * 60 * 60 * 1000;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      {lastActive ? (
        <SyncIcon sx={{ fontSize: 18, color: isRecent ? 'success.main' : 'text.secondary' }} />
      ) : (
        <SyncDisabledIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      )}
      <Typography variant="body2" color={isRecent ? 'text.primary' : 'text.secondary'}>
        {lastActive ? `Last sync: ${lastActive.toLocaleString()}` : 'No activity logged yet'}
      </Typography>
    </Box>
  );
}
