import React, { useState, useEffect } from 'react';
import { Button, TextField, Box, Typography } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';

export default function SetPasswordForm({ prefilledUid, onClose }) {
  const [uid, setUid] = useState(prefilledUid || '');
  const [newPassword, setNewPassword] = useState('');

  // Initialize Functions + reference the onCall function
  const functions = getFunctions();
  const setUserPassword = httpsCallable(functions, 'setUserPassword');

  // If a UID is passed in as props, prefill it
  useEffect(() => {
    if (prefilledUid) {
      setUid(prefilledUid);
    }
  }, [prefilledUid]);

  // Handle the button click to set password
  const handleSetPassword = async () => {
    if (!uid || !newPassword) {
      toast.error('Please provide both user ID and new password.');
      return;
    }
    try {
      // Call the cloud function
      const result = await setUserPassword({ uid, newPassword });
      // On success, the cloud function returns { message: 'Password updated successfully!' }
      toast.success(result.data.message);
      setUid('');
      setNewPassword('');
      // If you want to close a modal after success, do so here
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Error setting password.');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Set User Password
      </Typography>
      <TextField
        label="User UID"
        variant="outlined"
        size="small"
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        sx={{ mr: 2, mb: 2 }}
      />
      <TextField
        label="New Password"
        variant="outlined"
        size="small"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        sx={{ mr: 2, mb: 2 }}
      />
      <Button variant="contained" onClick={handleSetPassword}>
        Set Password
      </Button>
    </Box>
  );
}
