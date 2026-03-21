import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock Firebase
let authCallback;
jest.mock('../src/firebaseConfig', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, cb) => {
    authCallback = cb;
    return jest.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: '123' } })),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(() => Promise.resolve({ val: () => 'admin' })),
}));

import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

function TestConsumer() {
  const { currentUser, isAdmin, isCaregiver, loading, userRole } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="isAdmin">{isAdmin.toString()}</span>
      <span data-testid="isCaregiver">{isCaregiver.toString()}</span>
      <span data-testid="userRole">{userRole || 'none'}</span>
      <span data-testid="hasUser">{(!!currentUser).toString()}</span>
    </div>
  );
}

describe('AuthContext', () => {
  test('initially shows loading state', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  test('sets user to null when not authenticated', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      authCallback(null);
    });

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('hasUser').textContent).toBe('false');
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });

  test('sets admin role when user has admin role in database', async () => {
    const mockUser = {
      uid: 'admin-123',
      email: 'admin@test.com',
      getIdTokenResult: jest.fn(() => Promise.resolve({ claims: { role: 'admin' } })),
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      await authCallback(mockUser);
    });

    expect(screen.getByTestId('hasUser').textContent).toBe('true');
    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
    expect(screen.getByTestId('isCaregiver').textContent).toBe('false');
  });

  test('throws when useAuth is used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
