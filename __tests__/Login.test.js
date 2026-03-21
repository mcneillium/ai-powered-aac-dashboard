import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

// Mock Firebase before importing component
jest.mock('../src/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, cb) => { cb(null); return jest.fn(); }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(() => Promise.resolve({ val: () => null })),
  onValue: jest.fn(),
}));

import Login from '../src/pages/Login';

const theme = createTheme();

function renderWithProviders(ui) {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </ThemeProvider>
  );
}

describe('Login', () => {
  test('renders login form with email, password, and submit button', () => {
    renderWithProviders(<Login />);

    expect(screen.getByTestId('emailInput')).toBeInTheDocument();
    expect(screen.getByTestId('passwordInput')).toBeInTheDocument();
    expect(screen.getByTestId('loginButton')).toBeInTheDocument();
  });

  test('allows user input in email and password fields', () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByTestId('emailInput');
    const passwordInput = screen.getByTestId('passwordInput');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('displays CommAI branding', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText('CommAI Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Sign in to manage your users')).toBeInTheDocument();
  });

  test('has sign up link', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });
});
