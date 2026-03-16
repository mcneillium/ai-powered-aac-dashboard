// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import theme from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster />
  </ThemeProvider>
);
