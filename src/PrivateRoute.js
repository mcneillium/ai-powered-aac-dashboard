// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function PrivateRoute({ children, requiredRole }) {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
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
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, enforce it
  if (requiredRole && role !== requiredRole) {
    // Redirect non-admin users away from admin pages
    if (requiredRole === 'admin') {
      return <Navigate to="/caregiver" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
