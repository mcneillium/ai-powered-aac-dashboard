// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './PrivateRoute';
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';

// Protected pages
import AdminDashboard from './pages/AdminDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import Caregivers from './pages/Caregivers';
import ConnectUser from './pages/ConnectUser';
import FineTuneMetrics from './pages/FineTuneMetrics';
import Logs from './pages/Logs';
import UserManagement from './pages/UserManagement';
import UserActions from './pages/UserActions';
import MyUsers from './pages/MyUsers';
import TestSystem from './pages/TestSystem';
import Notifications from './Notifications';
import FeedbackAdmin from './pages/FeedbackAdmin';
import SystemSettings from './pages/SystemSettings';

function ProtectedPage({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedPage><AdminDashboard /></ProtectedPage>} />
          <Route path="/user-management" element={<ProtectedPage><UserManagement /></ProtectedPage>} />
          <Route path="/user-actions/:userId" element={<ProtectedPage><UserActions /></ProtectedPage>} />
          <Route path="/caregivers" element={<ProtectedPage><Caregivers /></ProtectedPage>} />
          <Route path="/feedback-admin" element={<ProtectedPage><FeedbackAdmin /></ProtectedPage>} />
          <Route path="/system-settings" element={<ProtectedPage><SystemSettings /></ProtectedPage>} />
          <Route path="/test-system" element={<ProtectedPage><TestSystem /></ProtectedPage>} />

          {/* Caregiver */}
          <Route path="/caregiver" element={<ProtectedPage><CaregiverDashboard /></ProtectedPage>} />
          <Route path="/my-users" element={<ProtectedPage><MyUsers /></ProtectedPage>} />
          <Route path="/connect-user" element={<ProtectedPage><ConnectUser /></ProtectedPage>} />

          {/* Shared */}
          <Route path="/logs" element={<ProtectedPage><Logs /></ProtectedPage>} />
          <Route path="/finetune-metrics" element={<ProtectedPage><FineTuneMetrics /></ProtectedPage>} />
          <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
