// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { ref, get } from 'firebase/database';
import { db } from '../firebaseConfig';
import { ROLES } from '../shared/schema';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await signIn(email, password);
      const user = userCredential.user;

      // Read role from database (single source of truth)
      const snap = await get(ref(db, `users/${user.uid}/role`));
      const role = snap.val();

      if (role === ROLES.ADMIN) {
        toast.success('Logged in successfully');
        navigate('/admin', { replace: true });
      } else if (role === ROLES.CAREGIVER) {
        toast.success('Logged in successfully');
        navigate('/caregiver', { replace: true });
      } else {
        setError('This dashboard is for caregivers and administrators only.');
        return;
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f4f6f8',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 420,
          width: '100%',
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#4CAF50', mb: 0.5 }}>
            CommAI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Caregiver & admin dashboard
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#388E3C' },
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/signup')}
              sx={{ color: '#4CAF50', fontWeight: 600 }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
