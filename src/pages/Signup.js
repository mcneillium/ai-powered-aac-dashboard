// src/pages/Signup.js
import React, { useState } from 'react';
import { Container, TextField, Button, Typography, CircularProgress, Box } from '@mui/material';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [name, setName] = useState(''); // Optional caregiver name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = getAuth();
  const db = getDatabase();
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save additional caregiver info in Realtime Database under 'caregivers'
      await set(ref(db, `caregivers/${user.uid}`), {
        name: name || 'Unnamed Caregiver',
        email: email,
        createdAt: Date.now()
      });
      
      // Navigate to main app after sign up
      navigate('/home');
    } catch (error) {
      alert('Sign up error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Sign Up
      </Typography>
      <Box component="form" noValidate sx={{ mt: 1 }}>
        {/* Optional: Name field */}
        <TextField
          label="Name (optional)"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          fullWidth
          margin="normal"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Button variant="contained" fullWidth onClick={handleSignUp} sx={{ mt: 2 }}>
            Sign Up
          </Button>
        )}
        <Button fullWidth sx={{ mt: 2 }} onClick={() => navigate('/')}>
          Already have an account? Log In
        </Button>
      </Box>
    </Container>
  );
}
