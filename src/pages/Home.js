// src/pages/Home.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, CircularProgress } from '@mui/material';

export default function Home() {
  const { currentUser, isAdmin, isCaregiver, authReady, roleLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady || roleLoading) return;

    if (!currentUser) {
      navigate('/login', { replace: true });
    } else if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isCaregiver) {
      navigate('/caregiver', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [currentUser, isAdmin, isCaregiver, authReady, roleLoading, navigate]);

  return (
    <Container sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={48} />
    </Container>
  );
}
