import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function PrivateRoute({ children, requiredRole }) {
  const { currentUser, authReady, roleLoading, isAdmin } = useAuth();

  if (!authReady) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (roleLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
