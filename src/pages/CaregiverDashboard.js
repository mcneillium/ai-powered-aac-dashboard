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
        <CircularProgress size={60} sx={{ color: '#4CAF50' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Caregiver Dashboard
      </Typography>
      {assignedUsers.map((user) => (
        <Paper key={user.uid} sx={{ mb: 3, p: 2, borderRadius: 2, backgroundColor: '#f1f8e9' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user.email}
          </Typography>
          <SyncStatusCard userId={user.uid} />
        </Paper>
      ))}
    </Container>
  );
}
