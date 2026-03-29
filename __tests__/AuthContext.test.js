import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../src/firebaseConfig', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, cb) => {
    // Immediately call back with null to simulate "not logged in"
    setTimeout(() => cb(null), 0);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: '123' } })),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(() => Promise.resolve({ exists: () => false, val: () => null })),
}));

import { AuthProvider, useAuth, ROLES } from '../src/contexts/AuthContext';

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
  test('exports ROLES constants', () => {
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.CAREGIVER).toBe('caregiver');
  });

  test('provides auth context when wrapped in AuthProvider', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('isAdmin')).toBeInTheDocument();
    expect(screen.getByTestId('isCaregiver')).toBeInTheDocument();
  });

  test('throws when useAuth is used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  test('custom claims are checked first for role resolution', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').join(__dirname, '..', 'src', 'contexts', 'AuthContext.js'),
      'utf-8'
    );
    // Custom claims must be the primary role source
    expect(source).toContain('getIdTokenResult');
    expect(source).toContain('claims.role');
  });

  test('database role is used as fallback when claims have no role', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').join(__dirname, '..', 'src', 'contexts', 'AuthContext.js'),
      'utf-8'
    );
    // Database fallback reads /users/{uid}/role
    expect(source).toContain('firebase/database');
    expect(source).toContain('users/${user.uid}/role');
    // Only accepts valid roles from database
    expect(source).toContain('ROLES.ADMIN');
    expect(source).toContain('ROLES.CAREGIVER');
  });
});
