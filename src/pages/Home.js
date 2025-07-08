// src/pages/Home.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, CircularProgress } from '@mui/material';

export default function Home() {
  const { currentUser, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate('/login', { replace: true });
      } else if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        // Redirect to caregiver dashboard or another page for non-admin users
        navigate('/caregiver', { replace: true });
      }
    }
  }, [currentUser, isAdmin, loading, navigate]);

  return (
    <Container
      sx={{
        py: 8,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}
    >
      <CircularProgress size={48} />
    </Container>
  );
}
