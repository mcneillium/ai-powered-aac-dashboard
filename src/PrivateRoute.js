// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const LoadingSpinner = () => (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <CircularProgress />
  </Box>
);

/**
 * PrivateRoute - requires authentication.
 * Optional `requiredRole` prop to restrict by role.
 */
export default function PrivateRoute({ children, requiredRole }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check it
  if (requiredRole && userRole !== requiredRole) {
    // Redirect non-admins trying to access admin pages to their dashboard
    if (userRole === 'caregiver') {
      return <Navigate to="/caregiver" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}
