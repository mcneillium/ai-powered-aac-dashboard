// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function PrivateRoute({ children, requiredRole }) {
  const { currentUser, role, authReady, roleLoading } = useAuth();

  // Wait for Firebase Auth to resolve
  if (!authReady) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Not logged in
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but role still loading
  if (roleLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Role enforcement
  if (requiredRole && role !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/caregiver" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
