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
    // The component renders without throwing
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('isAdmin')).toBeInTheDocument();
    expect(screen.getByTestId('isCaregiver')).toBeInTheDocument();
  });

  test('throws when useAuth is used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  test('does NOT import or use firebase/database for role resolution', () => {
    // AuthContext must source roles from custom claims only, not the database.
    // Verify the source file does not import database modules.
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').join(__dirname, '..', 'src', 'contexts', 'AuthContext.js'),
      'utf-8'
    );
    expect(source).not.toContain('firebase/database');
    expect(source).not.toContain('ref(db');
    expect(source).toContain('getIdTokenResult');
    expect(source).toContain('claims.role');
  });

  test('role is sourced from custom claims, not database', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').join(__dirname, '..', 'src', 'contexts', 'AuthContext.js'),
      'utf-8'
    );
    // Must NOT contain the dangerous database fallback
    expect(source).not.toContain("get(ref(db, `users/");
    expect(source).not.toContain("snap.val()");
    // Must contain the secure custom claims path
    expect(source).toContain('tokenResult.claims.role');
  });
});
