// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import PrivateRoute from './PrivateRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import CaregiverDashboard from './pages/CaregiverDashboard';
import Caregivers from './pages/Caregivers';
import ConnectUser from './pages/ConnectUser';
import FineTuneMetrics from './pages/FineTuneMetrics';
import Logs from './pages/Logs';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import UserActions from './pages/UserActions';
import { AuthProvider } from './contexts/AuthContext';

function ProtectedLayout({ children, requiredRole }) {
  return (
    <PrivateRoute requiredRole={requiredRole}>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </PrivateRoute>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<Home />} />

            {/* Admin-only routes */}
            <Route
              path="/admin"
              element={
                <ProtectedLayout requiredRole="admin">
                  <AdminDashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/user-management"
              element={
                <ProtectedLayout requiredRole="admin">
                  <UserManagement />
                </ProtectedLayout>
              }
            />
            <Route
              path="/caregivers"
              element={
                <ProtectedLayout requiredRole="admin">
                  <Caregivers />
                </ProtectedLayout>
              }
            />
            <Route
              path="/user-actions/:userId"
              element={
                <ProtectedLayout requiredRole="admin">
                  <UserActions />
                </ProtectedLayout>
              }
            />

            {/* Caregiver routes (accessible by both caregivers and admins) */}
            <Route
              path="/caregiver"
              element={
                <ProtectedLayout>
                  <CaregiverDashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/connect-user"
              element={
                <ProtectedLayout>
                  <ConnectUser />
                </ProtectedLayout>
              }
            />

            {/* Shared routes */}
            <Route
              path="/finetune-metrics"
              element={
                <ProtectedLayout>
                  <FineTuneMetrics />
                </ProtectedLayout>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedLayout>
                  <Logs />
                </ProtectedLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
