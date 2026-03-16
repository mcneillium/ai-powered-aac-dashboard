import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../src/pages/Login';
import { AuthProvider } from '../src/contexts/AuthContext';

// Mock Firebase
jest.mock('../src/firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, cb) => {
    cb(null);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

test('renders login form and allows user input', () => {
  render(
    <AuthProvider>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </AuthProvider>
  );

  const emailInput = screen.getByTestId('emailInput');
  const passwordInput = screen.getByTestId('passwordInput');
  const loginButton = screen.getByTestId('loginButton');

  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });

  expect(emailInput.value).toBe('test@example.com');
  expect(passwordInput.value).toBe('password123');
  expect(loginButton).toBeInTheDocument();
});
