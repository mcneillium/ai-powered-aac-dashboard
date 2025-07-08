// src/pages/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Container,
} from '@mui/material';
import SyncStatusCard from '../components/SyncStatusCard';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    const usersRef = ref(db, 'users');

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const userList = data ? Object.entries(data).map(([uid, info]) => ({ uid, ...info })) : [];
      setUsers(userList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        Admin Dashboard
      </Typography>
      {users.map((user) => (
        <Paper key={user.uid} sx={{ mb: 3, p: 2, borderRadius: 2, backgroundColor: '#e8f5e9' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user.email} ({user.role})
          </Typography>
          <SyncStatusCard userId={user.uid} />
        </Paper>
      ))}
    </Container>
  );
}
