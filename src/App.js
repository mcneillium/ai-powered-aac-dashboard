import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeModeProvider } from './contexts/ThemeContext';
import PrivateRoute from './PrivateRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import PageSkeleton from './components/PageSkeleton';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import AccessDenied from './pages/AccessDenied';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CaregiverDashboard = lazy(() => import('./pages/CaregiverDashboard'));
const ConnectUser = lazy(() => import('./pages/ConnectUser'));
const FineTuneMetrics = lazy(() => import('./pages/FineTuneMetrics'));
const Logs = lazy(() => import('./pages/Logs'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const UserActions = lazy(() => import('./pages/UserActions'));
const MyUsers = lazy(() => import('./pages/MyUsers'));
const TestSystem = lazy(() => import('./pages/TestSystem'));
const Notifications = lazy(() => import('./Notifications'));
const FeedbackAdmin = lazy(() => import('./pages/FeedbackAdmin'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Caregivers = lazy(() => import('./pages/Caregivers'));
const Alerts = lazy(() => import('./pages/Alerts'));
const CustomBoards = lazy(() => import('./pages/CustomBoards'));
const Favorites = lazy(() => import('./pages/Favorites'));

function ProtectedPage({ children, requiredRole }) {
  return (
    <PrivateRoute requiredRole={requiredRole}>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </PrivateRoute>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <AuthProvider>
          <Router>
            <Toaster position="top-right" />
            <Routes>
              {/* Public */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* Admin only */}
              <Route path="/admin" element={<ProtectedPage requiredRole="admin"><AdminDashboard /></ProtectedPage>} />
              <Route path="/user-management" element={<ProtectedPage requiredRole="admin"><UserManagement /></ProtectedPage>} />
              <Route path="/user-actions/:userId" element={<ProtectedPage requiredRole="admin"><UserActions /></ProtectedPage>} />
              <Route path="/user-settings/:userId" element={<ProtectedPage requiredRole="admin"><UserSettings /></ProtectedPage>} />
              <Route path="/feedback-admin" element={<ProtectedPage requiredRole="admin"><FeedbackAdmin /></ProtectedPage>} />
              <Route path="/feedback" element={<ProtectedPage requiredRole="admin"><Feedback /></ProtectedPage>} />
              <Route path="/system-settings" element={<ProtectedPage requiredRole="admin"><SystemSettings /></ProtectedPage>} />
              <Route path="/test-system" element={<ProtectedPage requiredRole="admin"><TestSystem /></ProtectedPage>} />
              <Route path="/caregivers" element={<ProtectedPage requiredRole="admin"><Caregivers /></ProtectedPage>} />
              <Route path="/finetune-metrics" element={<ProtectedPage requiredRole="admin"><FineTuneMetrics /></ProtectedPage>} />

              {/* Caregiver + Admin */}
              <Route path="/caregiver" element={<ProtectedPage><CaregiverDashboard /></ProtectedPage>} />
              <Route path="/my-users" element={<ProtectedPage><MyUsers /></ProtectedPage>} />
              <Route path="/connect-user" element={<ProtectedPage><ConnectUser /></ProtectedPage>} />
              <Route path="/custom-boards" element={<ProtectedPage><CustomBoards /></ProtectedPage>} />
              <Route path="/favorites" element={<ProtectedPage><Favorites /></ProtectedPage>} />

              {/* Shared */}
              <Route path="/alerts" element={<ProtectedPage><Alerts /></ProtectedPage>} />
              <Route path="/logs" element={<ProtectedPage><Logs /></ProtectedPage>} />
              <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}

export default App;
