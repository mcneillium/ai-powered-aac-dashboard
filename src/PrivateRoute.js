// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth'; // or your custom auth logic

export default function PrivateRoute({ children }) {
  const auth = getAuth();
  const user = auth.currentUser;

  // If not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/" />;
  }

  // Otherwise, render the protected content
  return children;
}
