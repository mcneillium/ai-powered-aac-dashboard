import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const theme = createTheme();

let mockAuthState = {};
jest.mock('../src/contexts/AuthContext', () => ({
  ...jest.requireActual('../src/contexts/AuthContext'),
  useAuth: () => mockAuthState,
}));

import PrivateRoute from '../src/PrivateRoute';

function renderRoute(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <PrivateRoute {...props}>
          <div data-testid="protected-content">Protected</div>
        </PrivateRoute>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('PrivateRoute', () => {
  test('shows loading spinner when auth is loading', () => {
    mockAuthState = { currentUser: null, userRole: null, loading: true };
    renderRoute();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('redirects to login when not authenticated', () => {
    mockAuthState = { currentUser: null, userRole: null, loading: false };
    renderRoute();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('renders children when authenticated with no role requirement', () => {
    mockAuthState = { currentUser: { uid: '123' }, userRole: 'caregiver', loading: false };
    renderRoute();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('renders children when user has required role', () => {
    mockAuthState = { currentUser: { uid: '123' }, userRole: 'admin', loading: false };
    renderRoute({ requiredRole: 'admin' });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('redirects when user does not have required role', () => {
    mockAuthState = { currentUser: { uid: '123' }, userRole: 'caregiver', loading: false };
    renderRoute({ requiredRole: 'admin' });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
