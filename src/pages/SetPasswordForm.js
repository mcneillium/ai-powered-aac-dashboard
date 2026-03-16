import React, { useState, useEffect } from 'react';
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
  LinearProgress
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';
import { Visibility, VisibilityOff, LockOutlined, PersonOutlined, Check, Close } from '@mui/icons-material';

// Password validation criteria - stable reference outside component
const passwordCriteria = [
  { label: "At least 8 characters", test: pwd => pwd.length >= 8 },
  { label: "Contains lowercase letter", test: pwd => /[a-z]/.test(pwd) },
  { label: "Contains uppercase letter", test: pwd => /[A-Z]/.test(pwd) },
  { label: "Contains number", test: pwd => /\d/.test(pwd) },
  { label: "Contains special character", test: pwd => /[^A-Za-z0-9]/.test(pwd) }
];

export default function SetPasswordForm({ prefilledUid, onClose, onSuccess }) {
  const [uid, setUid] = useState(prefilledUid || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState([]);

  // Initialize Functions + reference the onCall function
  const functions = getFunctions();
  const setUserPassword = httpsCallable(functions, 'setUserPassword');

  // If a UID is passed in as props, prefill it
  useEffect(() => {
    if (prefilledUid) {
      setUid(prefilledUid);
    }
  }, [prefilledUid]);

  // Evaluate password strength as password changes
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      setPasswordFeedback([]);
      return;
    }
    
    // Check which criteria are met
    const meetsArr = passwordCriteria.map(criteria => ({
      label: criteria.label,
      meets: criteria.test(newPassword)
    }));
    
    setPasswordFeedback(meetsArr);
    
    // Calculate strength percentage (20% for each criterion met)
    const strengthPercentage = (meetsArr.filter(item => item.meets).length / meetsArr.length) * 100;
    setPasswordStrength(strengthPercentage);
    
  }, [newPassword]);

  // Get color for password strength indicator
  const getStrengthColor = () => {
    if (passwordStrength < 40) return "error";
    if (passwordStrength < 70) return "warning";
    return "success";
  };

  // Handle the button click to set password
  const handleSetPassword = async () => {
    // Reset states
    setError('');
    setSuccess(false);
    
    // Validate inputs
    if (!uid) {
      setError('User ID is required');
      return;
    }
    
    if (!newPassword) {
      setError('Password is required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Check for minimum password strength
    if (passwordStrength < 40) {
      setError('Password is too weak. Please include more variety.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the cloud function
      const result = await setUserPassword({ uid, newPassword });
      
      // On success, the cloud function returns { message: 'Password updated successfully!' }
      setSuccess(true);
      toast.success(result.data.message);
      
      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(uid);
      }
      
      // Close modal after delay if onClose provided
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error setting password:', error);
      
      // Extract error message from Firebase Functions response
      const errorMessage = error.message || 'Unknown error occurred';
      setError(`Error setting password: ${errorMessage}`);
      toast.error('Error setting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <LockOutlined sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6">
          Set User Password
        </Typography>
      </Box>
      
      {/* Success message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password updated successfully!
        </Alert>
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <TextField
          label="User UID"
          variant="outlined"
          fullWidth
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          disabled={!!prefilledUid || loading}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlined />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="New Password"
          variant="outlined"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ mb: 1 }}
        />
        
        {/* Password strength indicator */}
        {newPassword && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Password Strength
              </Typography>
              <Typography variant="body2" color={getStrengthColor()}>
                {passwordStrength < 40 ? 'Weak' : 
                 passwordStrength < 70 ? 'Moderate' : 'Strong'}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={passwordStrength} 
              color={getStrengthColor()}
              sx={{ mt: 1, mb: 1, height: 8, borderRadius: 4 }}
            />
            
            {/* Password criteria checklist */}
            <Box sx={{ mt: 1 }}>
              {passwordFeedback.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  {item.meets ? (
                    <Check fontSize="small" color="success" />
                  ) : (
                    <Close fontSize="small" color="error" />
                  )}
                  <Typography 
                    variant="body2" 
                    color={item.meets ? "text.primary" : "text.secondary"}
                    sx={{ ml: 1 }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        <TextField
          label="Confirm Password"
          variant="outlined"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          required
          error={confirmPassword !== '' && confirmPassword !== newPassword}
          helperText={confirmPassword !== '' && confirmPassword !== newPassword ? 'Passwords do not match' : ''}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined />
              </InputAdornment>
            )
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        {onClose && (
          <Button 
            variant="outlined" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        
        <Button 
          variant="contained" 
          onClick={handleSetPassword}
          disabled={loading || !uid || !newPassword || newPassword !== confirmPassword}
          sx={{ minWidth: 120 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Set Password'}
        </Button>
      </Box>
      
      {/* Security Guidelines */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Security Guidelines:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Create strong, unique passwords for each user account<br />
          • Never share passwords over email or messaging<br />
          • Consider using a password manager for secure storage<br />
          • Reset passwords periodically for sensitive accounts
        </Typography>
      </Box>
    </Paper>
  );
}