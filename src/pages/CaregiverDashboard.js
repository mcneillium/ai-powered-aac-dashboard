// src/pages/CaregiverDashboard.js
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  Container,
  CircularProgress,
} from '@mui/material';
import SyncStatusCard from '../components/SyncStatusCard';

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const caregiverId = currentUser?.uid;
    if (!caregiverId) return;

    const usersRef = ref(db, 'users');

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const filtered = data
        ? Object.entries(data)
            .filter(([uid, info]) => info.caregiverId === caregiverId)
            .map(([uid, info]) => ({ uid, ...info }))
        : [];
      setAssignedUsers(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} color="primary" />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Caregiver Dashboard
      </Typography>
      {assignedUsers.length > 0 ? (
        assignedUsers.map((user) => (
          <Paper key={user.uid} sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.highlight' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user.name || user.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {user.email}
            </Typography>
            <SyncStatusCard userId={user.uid} />
          </Paper>
        ))
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No users assigned to you yet. Use the Connect User page to link with users.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
