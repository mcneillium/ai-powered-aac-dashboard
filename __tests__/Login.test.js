import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

jest.mock('../src/firebaseConfig', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, cb) => { cb(null); return jest.fn(); }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

import { AuthProvider } from '../src/contexts/AuthContext';
import Login from '../src/pages/Login';

const theme = createTheme();

function renderLogin() {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Login', () => {
  test('renders login form with email, password, and submit button', () => {
    renderLogin();
    expect(screen.getByTestId('emailInput')).toBeInTheDocument();
    expect(screen.getByTestId('passwordInput')).toBeInTheDocument();
    expect(screen.getByTestId('loginButton')).toBeInTheDocument();
  });

  test('allows user input in email and password fields', () => {
    renderLogin();
    const emailInput = screen.getByTestId('emailInput');
    const passwordInput = screen.getByTestId('passwordInput');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('displays Voice branding', () => {
    renderLogin();
    expect(screen.getByText('Voice Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Sign in to manage your users')).toBeInTheDocument();
  });

  test('has sign up link', () => {
    renderLogin();
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });
});
