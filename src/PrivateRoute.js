// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function PrivateRoute({ children, requireAdmin = false }) {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    // still initializing auth → show spinner
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    // not logged in → redirect to login
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && !isAdmin) {
    // logged in but not an administrator → back to home
    return <Navigate to="/home" replace />;
  }
  return children;
}
