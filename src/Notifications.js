// src/pages/Notifications.js
import React from 'react';
import { Container, Typography } from '@mui/material';

export default function Notifications() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4">Notifications</Typography>
      <Typography variant="body1">
        This page will display system notifications or recent activity alerts.
      </Typography>
    </Container>
  );
}
