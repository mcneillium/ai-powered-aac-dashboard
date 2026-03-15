// src/components/SyncStatusCard.js
import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { getDatabase, ref, onValue } from 'firebase/database';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SyncStatusCard({ userId }) {
  const [lastActive, setLastActive] = useState(null);
  const [status, setStatus] = useState('unknown');

  useEffect(() => {
    if (!userId) return;
    const db = getDatabase();
    const syncRef = ref(db, `userSync/${userId}`);

    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastActivity) {
        setLastActive(data.lastActivity);
        const diff = Date.now() - new Date(data.lastActivity).getTime();
        const hoursDiff = diff / (1000 * 60 * 60);
        setStatus(hoursDiff < 1 ? 'online' : hoursDiff < 24 ? 'recent' : 'inactive');
      } else {
        setLastActive(null);
        setStatus('unknown');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const statusConfig = {
    online: { label: 'Active', color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
    recent: { label: 'Recent', color: 'info', icon: <SyncIcon sx={{ fontSize: 16 }} /> },
    inactive: { label: 'Inactive', color: 'warning', icon: <WarningIcon sx={{ fontSize: 16 }} /> },
    unknown: { label: 'No data', color: 'default', icon: null },
  };

  const config = statusConfig[status];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        sx={{ height: 24, fontSize: 12 }}
      />
      <Typography variant="caption" color="text.secondary">
        {lastActive ? `Last active: ${timeAgo(lastActive)}` : 'No activity logged yet'}
      </Typography>
    </Box>
  );
}
