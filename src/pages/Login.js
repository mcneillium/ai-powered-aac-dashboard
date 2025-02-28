import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Box, Typography, TextField, Button } from '@mui/material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (error) {
      console.error('Login error:', error);
      alert('Invalid credentials or error logging in.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Login
      </Typography>
      <TextField
        label="Email"
        variant="outlined"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        sx={{ mb: 2, width: '300px' }}
      />
      <TextField
        label="Password"
        variant="outlined"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        sx={{ mb: 2, width: '300px' }}
      />
      <Button variant="contained" onClick={handleLogin}>
        Sign In
      </Button>
    </Box>
  );
}
