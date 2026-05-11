import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(),
  get: jest.fn(() => Promise.resolve({ val: () => null, exists: () => false })),
  onValue: jest.fn(() => jest.fn()),
  off: jest.fn(),
  query: jest.fn(),
  orderByChild: jest.fn(),
  limitToLast: jest.fn(),
  push: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_, cb) => { cb(null); return jest.fn(); }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn()),
}));

import App from './App';

test('renders login page with CommAI heading', async () => {
  render(<App />);
  const heading = await screen.findByText('CommAI');
  expect(heading).toBeInTheDocument();
});

test('renders email and password fields on login', async () => {
  render(<App />);
  const emailField = await screen.findByLabelText(/email/i);
  const passwordField = await screen.findByLabelText(/password/i);
  expect(emailField).toBeInTheDocument();
  expect(passwordField).toBeInTheDocument();
});
