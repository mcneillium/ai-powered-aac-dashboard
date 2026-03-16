import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Firebase
jest.mock('./firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, cb) => {
    // Simulate no user logged in
    cb(null);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

test('renders login page by default', () => {
  render(<App />);
  const loginButton = screen.getByTestId('loginButton');
  expect(loginButton).toBeInTheDocument();
});
