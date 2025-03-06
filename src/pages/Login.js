// src/pages/Login.js
import React, { useState } from 'react';
import { Container, TextField, Button, Typography, CircularProgress, Box } from '@mui/material';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// Import your logo image
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home'); // Adjust route name as needed
    } catch (error) {
      alert('Login error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      {/* Logo Section */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <img 
          src={logo} 
          alt="App Logo" 
          style={{ width: '150px', height: 'auto', margin: '0 auto' }} 
        />
      </Box>
      <Box component="form" noValidate sx={{ mt: 1 }}>
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <TextField
          label="Password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Button variant="contained" fullWidth onClick={handleLogin} sx={{ mt: 2 }}>
            Log In
          </Button>
        )}
        <Button fullWidth sx={{ mt: 2 }} onClick={() => navigate('/Signup')}>
          Don't have an account? Sign Up
        </Button>
      </Box>
    </Container>
  );
}
