import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

jest.mock('../src/firebaseConfig', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn((auth, cb) => { cb(null); return jest.fn(); }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(() => Promise.resolve()),
  get: jest.fn(() => Promise.resolve({ val: () => null })),
}));

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }) => <div>{children}</div>,
}));

import Signup from '../src/pages/Signup';

const theme = createTheme();

describe('Signup', () => {
  test('renders signup form with name, email, password fields', () => {
    render(
      <ThemeProvider theme={theme}>
        <Signup />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  test('has sign in link', () => {
    render(
      <ThemeProvider theme={theme}>
        <Signup />
      </ThemeProvider>
    );

    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });
});
