import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';
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

const statusConfig = {
  online: { label: 'Active', color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
  recent: { label: 'Recent', color: 'info', icon: <SyncIcon sx={{ fontSize: 16 }} /> },
  inactive: { label: 'Inactive', color: 'warning', icon: <WarningIcon sx={{ fontSize: 16 }} /> },
  unknown: { label: 'No data', color: 'default', icon: null },
};

export default React.memo(function SyncStatusCard({ userId }) {
  const [lastActive, setLastActive] = useState(null);
  const [status, setStatus] = useState('unknown');

  useEffect(() => {
    if (!userId) return;
    const syncRef = ref(db, `${DB_PATHS.USER_SYNC}/${userId}`);

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
    }, () => {
      setStatus('unknown');
    });

    return () => { off(syncRef); unsubscribe(); };
  }, [userId]);

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
});
