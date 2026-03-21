// src/pages/SetPasswordForm.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { Visibility, VisibilityOff, LockOutlined, PersonOutlined, Check, Close } from '@mui/icons-material';
import { auth } from '../firebaseConfig';

const PASSWORD_CRITERIA = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Contains number', test: (pwd) => /\d/.test(pwd) },
  { label: 'Contains special character', test: (pwd) => /[^A-Za-z0-9]/.test(pwd) },
];

// Cloud Function URL - uses environment variable or defaults
const FUNCTION_URL = process.env.REACT_APP_SET_PASSWORD_URL
  || `https://europe-west1-${process.env.REACT_APP_FIREBASE_PROJECT_ID}.cloudfunctions.net/setUserPassword`;

export default function SetPasswordForm({ prefilledUid, onClose, onSuccess }) {
  const [uid, setUid] = useState(prefilledUid || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (prefilledUid) setUid(prefilledUid);
  }, [prefilledUid]);

  const passwordFeedback = useMemo(() => {
    if (!newPassword) return [];
    return PASSWORD_CRITERIA.map((c) => ({ label: c.label, meets: c.test(newPassword) }));
  }, [newPassword]);

  const passwordStrength = useMemo(() => {
    if (!passwordFeedback.length) return 0;
    return (passwordFeedback.filter((f) => f.meets).length / passwordFeedback.length) * 100;
  }, [passwordFeedback]);

  const getStrengthColor = () => {
    if (passwordStrength < 40) return 'error';
    if (passwordStrength < 70) return 'warning';
    return 'success';
  };

  const handleSetPassword = async () => {
    setError('');
    setSuccess(false);

    if (!uid) { setError('User ID is required'); return; }
    if (!newPassword) { setError('Password is required'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (passwordStrength < 40) { setError('Password is too weak.'); return; }

    setLoading(true);
    try {
      // Get the current user's ID token for authentication
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      setSuccess(true);
      toast.success(data.message || 'Password updated.');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) onSuccess(uid);
      if (onClose) setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message || 'Error setting password');
      toast.error('Error setting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockOutlined color="primary" />
        <Typography variant="h6">Set User Password</Typography>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>Password updated.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        label="User UID"
        fullWidth
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        disabled={!!prefilledUid || loading}
        required
        InputProps={{
          startAdornment: <InputAdornment position="start"><PersonOutlined /></InputAdornment>,
        }}
        sx={{ mb: 2 }}
      />

      <TextField
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        fullWidth
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        disabled={loading}
        required
        InputProps={{
          startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {newPassword && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Strength</Typography>
            <Typography variant="caption" color={`${getStrengthColor()}.main`}>
              {passwordStrength < 40 ? 'Weak' : passwordStrength < 70 ? 'Moderate' : 'Strong'}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={passwordStrength} color={getStrengthColor()} sx={{ height: 6, borderRadius: 3, mb: 1 }} />
          {passwordFeedback.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 0.3 }}>
              {item.meets ? <Check sx={{ fontSize: 16 }} color="success" /> : <Close sx={{ fontSize: 16 }} color="error" />}
              <Typography variant="caption" sx={{ ml: 0.5 }} color={item.meets ? 'text.primary' : 'text.secondary'}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <TextField
        label="Confirm Password"
        type={showPassword ? 'text' : 'password'}
        fullWidth
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={loading}
        required
        error={confirmPassword !== '' && confirmPassword !== newPassword}
        helperText={confirmPassword !== '' && confirmPassword !== newPassword ? 'Passwords do not match' : ''}
        InputProps={{
          startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>,
        }}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {onClose && (
          <Button variant="outlined" onClick={onClose} disabled={loading}>Cancel</Button>
        )}
        <Button
          variant="contained"
          onClick={handleSetPassword}
          disabled={loading || !uid || !newPassword || newPassword !== confirmPassword}
        >
          {loading ? <CircularProgress size={22} /> : 'Set Password'}
        </Button>
      </Box>
    </Paper>
  );
}
