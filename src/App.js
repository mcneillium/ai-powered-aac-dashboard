// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import Login from './pages/Login';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/home"   element={<Home />} />

          {/* Admin-only routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute requiredRole="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/caregivers"
            element={
              <PrivateRoute requiredRole="admin">
                <Caregivers />
              </PrivateRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <PrivateRoute requiredRole="admin">
                <UserManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/user-actions/:userId"
            element={
              <PrivateRoute requiredRole="admin">
                <UserActions />
              </PrivateRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <PrivateRoute requiredRole="admin">
                <Logs />
              </PrivateRoute>
            }
          />
          <Route
            path="/finetune-metrics"
            element={
              <PrivateRoute requiredRole="admin">
                <FineTuneMetrics />
              </PrivateRoute>
            }
          />
          <Route
            path="/connect-user"
            element={
              <PrivateRoute requiredRole="admin">
                <ConnectUser />
              </PrivateRoute>
            }
          />

          {/* Caregiver route (any authenticated user) */}
          <Route
            path="/caregiver"
            element={
              <PrivateRoute>
                <CaregiverDashboard />
              </PrivateRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
