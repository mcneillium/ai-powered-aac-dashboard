import React from 'react';
import { Box, Skeleton, Grid } from '@mui/material';

export default function PageSkeleton() {
  return (
    <Box sx={{ py: 2 }}>
      <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
    </Box>
  );
}
