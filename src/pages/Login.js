import React, { useState } from 'react';
import { Container, TextField, Button, CircularProgress, Box } from '@mui/material';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const tokenResult = await user.getIdTokenResult();
      const role = tokenResult.claims.role;

      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'caregiver') {
        navigate('/caregiver');
      } else {
        navigate('/home');
      }

    } catch (error) {
      alert('Login error: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
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
          inputProps={{ 'data-testid': 'emailInput' }}
          required
        />
        <TextField
          label="Password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          inputProps={{ 'data-testid': 'passwordInput' }}
          required
        />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            sx={{ mt: 2 }}
            data-testid="loginButton"
          >
            Log In
          </Button>
        )}
        {/* Account creation is managed by administrators */}
      </Box>
    </Container>
  );
}
