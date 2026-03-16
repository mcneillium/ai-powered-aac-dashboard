// src/components/ErrorBoundary.js
import React from 'react';
import { Container, Typography, Button, Paper, Box } from '@mui/material';

/**
 * Top-level error boundary that catches unhandled React errors
 * and shows a recovery UI instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              An unexpected error occurred. Please try refreshing the page.
            </Typography>
            {this.state.error && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="error" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {this.state.error.message}
                </Typography>
              </Box>
            )}
            <Button variant="contained" onClick={this.handleReset}>
              Try Again
            </Button>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
