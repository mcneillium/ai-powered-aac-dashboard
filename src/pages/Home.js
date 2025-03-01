import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, Button, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" align="center" gutterBottom>
        Caregiver Dashboard - Home
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        {isAdmin && (
          <>
            <Button variant="contained" component={Link} to="/caregivers">
              Manage Caregivers
            </Button>
            <Button variant="contained" component={Link} to="/UserManagement">
              Manage Users
            </Button>
          </>
        )}
        <Button variant="outlined" component={Link} to="/logs">
          View User Logs
        </Button>
      </Box>
    </Container>
  );
}
