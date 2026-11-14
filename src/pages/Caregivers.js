// src/pages/Caregivers.js
// This page is now replaced by UserManagement with role filtering.
// Redirect to user management for backward compatibility.
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Caregivers() {
  return <Navigate to="/user-management" replace />;
}
