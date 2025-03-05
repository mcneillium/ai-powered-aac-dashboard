// Code to create a new user account with email and password
// The user's name, email, and creation time are stored in the database
// The user is redirected to the home page after successful sign up

import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getDatabase();

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await set(ref(db, `users/${user.uid}`), {
        name: name || 'Unnamed User',
        email: email,
        createdAt: Date.now()
      });
      navigate('/home');
    } catch (error) {
      alert('Sign up error: ' + error.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Sign Up
      </Typography>
      <Box component="form" noValidate sx={{ mt: 1 }}>
        <TextField
          label="Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <Button variant="contained" fullWidth onClick={handleSignUp} sx={{ mt: 2 }}>
          Sign Up
        </Button>
      </Box>
    </Container>
  );
}
