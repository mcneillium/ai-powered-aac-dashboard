import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
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
import { ref, get, set } from 'firebase/database';
import { auth, db } from '../firebaseConfig';
import { ROLES, DB_PATHS } from '../shared/schema';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
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

      const roleSnap = await get(ref(db, `${DB_PATHS.USERS}/${user.uid}/role`));
      let role = roleSnap.val();

      if (!role) {
        const usersSnap = await get(ref(db, DB_PATHS.USERS));
        const isFirstUser = !usersSnap.exists() || !usersSnap.val();
        role = isFirstUser ? ROLES.ADMIN : ROLES.CAREGIVER;

        await set(ref(db, `${DB_PATHS.USERS}/${user.uid}`), {
          email: user.email,
          name: user.displayName || user.email,
          role: role,
          createdAt: Date.now()
        });
        toast.success(`Account set up as ${role}`);
      }

      toast.success('Logged in successfully');
      navigate(role === ROLES.ADMIN ? '/admin' : '/caregiver', { replace: true });
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

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      toast.success('Password reset email sent!');
    } catch (err) {
      const msg = err.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : 'Failed to send password reset email.';
      setError(msg);
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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.main', mb: 0.5 }}>
            CommAI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Caregiver & admin dashboard
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {resetSent && <Alert severity="success" sx={{ mb: 2 }}>Password reset email sent. Check your inbox.</Alert>}

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
            sx={{ mb: 1 }}
          />
          <Box sx={{ textAlign: 'right', mb: 2 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ color: 'primary.main', fontSize: 13 }}
            >
              Forgot password?
            </Link>
          </Box>
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
              sx={{ color: 'primary.main', fontWeight: 600 }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
