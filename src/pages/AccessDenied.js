import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', p: 3,
    }}>
      <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h4" gutterBottom>Access Denied</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        You don't have permission to view this page.
      </Typography>
      <Button variant="contained" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Box>
  );
}
