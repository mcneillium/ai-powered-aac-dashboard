// src/pages/Login.js
import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  CircularProgress,
  Box,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signIn(email, password);
      const user = userCredential.user;
      const tokenResult = await user.getIdTokenResult();
      const role = tokenResult.claims.role;

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'caregiver') {
        navigate('/caregiver', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      setError(messages[err.code] || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        <Paper sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <img
              src={logo}
              alt="CommAI"
              style={{ width: 80, height: 'auto', marginBottom: 12 }}
            />
            <Typography variant="h5" fontWeight={700} color="primary">
              CommAI Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage your users
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate>
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              autoFocus
              inputProps={{ 'data-testid': 'emailInput' }}
              required
            />
            <TextField
              label="Password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              inputProps={{ 'data-testid': 'passwordInput' }}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mt: 2, py: 1.2 }}
              data-testid="loginButton"
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            <Button
              fullWidth
              sx={{ mt: 1.5 }}
              onClick={() => navigate('/signup')}
              color="inherit"
            >
              Don't have an account? Sign Up
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
