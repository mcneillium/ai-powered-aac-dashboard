// src/pages/Home.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, CircularProgress } from '@mui/material';

export default function Home() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        navigate('/admin'); // Redirect admin users to the Admin Dashboard
      } else {
        navigate('/caregiver'); // Redirect caregiver users to the Caregiver Dashboard
      }
    }
  }, [isAdmin, loading, navigate]);

  return (
    <Container sx={{ py: 4, textAlign: 'center' }}>
      <CircularProgress />
    </Container>
  );
}
