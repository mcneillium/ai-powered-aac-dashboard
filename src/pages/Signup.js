// src/pages/Signup.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebaseConfig';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Link,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { ROLES, DB_PATHS } from '../shared/schema';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES.CAREGIVER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `${DB_PATHS.USERS}/${cred.user.uid}`), {
        name: name || 'Unnamed User',
        email,
        role,
        createdAt: Date.now(),
      });
      toast.success('Account created successfully');
      navigate('/home', { replace: true });
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : err.message;
      setError(msg);
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
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.main', mb: 0.5 }}>
            CommAI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your account
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSignup}>
          <TextField
            label="Full name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Confirm password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" sx={{ mb: 1 }}>I am a:</Typography>
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(e, val) => val && setRole(val)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value={ROLES.CAREGIVER} sx={{ textTransform: 'none' }}>Caregiver</ToggleButton>
            <ToggleButton value={ROLES.USER} sx={{ textTransform: 'none' }}>AAC User</ToggleButton>
          </ToggleButtonGroup>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/login')}
              sx={{ color: 'primary.main', fontWeight: 600 }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
