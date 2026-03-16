// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

/**
 * Route guard that checks authentication and optionally role-based access.
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized.
 * @param {string} [props.requiredRole] - If set, only users with this role can access.
 *   'admin' = admin only, 'caregiver' = caregiver only. Omit for any authenticated user.
 */
export default function PrivateRoute({ children, requiredRole }) {
  const { currentUser, userRole, loading } = useAuth();

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

  // If a specific role is required and user doesn't have it, redirect to their dashboard
  if (requiredRole && userRole !== requiredRole) {
    const fallback = userRole === 'admin' ? '/admin' : '/caregiver';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
