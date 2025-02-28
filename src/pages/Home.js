import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, Button } from '@mui/material';
import { getAuth } from 'firebase/auth';

export default function Home() {
  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      auth.currentUser.getIdTokenResult()
        .then((idTokenResult) => {
          console.log('User claims:', idTokenResult.claims);
          if (idTokenResult.claims.role === 'admin') {
            console.log('User is admin');
          } else {
            console.log('User is not admin');
          }
        })
        .catch((error) => {
          console.error('Error fetching token claims:', error);
        });
    }
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" align="center" gutterBottom>
        Caregiver Dashboard - Home
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button 
          variant="contained" 
          component={Link} 
          to="/caregivers"
        >
          Manage Caregivers
        </Button>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/logs"
        >
          View User Logs
        </Button>
      </Box>
    </Container>
  );
}
