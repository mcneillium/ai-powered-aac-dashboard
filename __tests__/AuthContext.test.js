import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

// Mock Firebase Auth
const mockOnAuthStateChanged = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock('../src/firebaseConfig', () => ({
  auth: {},
  db: {},
}));

// Test component that displays auth state
function TestConsumer() {
  const { currentUser, isAdmin, userRole, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{currentUser ? currentUser.email : 'none'}</span>
      <span data-testid="role">{userRole || 'none'}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts in loading state', () => {
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  test('sets currentUser and admin role when user has admin claim', async () => {
    const mockUser = {
      uid: 'admin-uid',
      email: 'admin@test.com',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { role: 'admin' }
      }),
    };

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('admin@test.com');
    expect(screen.getByTestId('role').textContent).toBe('admin');
    expect(screen.getByTestId('admin').textContent).toBe('true');
  });

  test('sets caregiver role correctly', async () => {
    const mockUser = {
      uid: 'cg-uid',
      email: 'caregiver@test.com',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { role: 'caregiver' }
      }),
    };

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('role').textContent).toBe('caregiver');
    expect(screen.getByTestId('admin').textContent).toBe('false');
  });

  test('clears state on logout (null user)', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('role').textContent).toBe('none');
    expect(screen.getByTestId('admin').textContent).toBe('false');
  });

  test('handles token fetch error gracefully', async () => {
    const mockUser = {
      uid: 'err-uid',
      email: 'error@test.com',
      getIdTokenResult: jest.fn().mockRejectedValue(new Error('Token error')),
    };

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // User should still be set, but role should be null/false
    expect(screen.getByTestId('user').textContent).toBe('error@test.com');
    expect(screen.getByTestId('role').textContent).toBe('none');
    expect(screen.getByTestId('admin').textContent).toBe('false');
  });
});
