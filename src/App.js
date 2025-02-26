// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import PrivateRoute from './PrivateRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Caregivers from './pages/Caregivers';
import Logs from './pages/Logs';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route for login */}
        <Route path="/" element={<Login />} />

        {/* Protected routes requiring the user to be logged in */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/caregivers"
          element={
            <PrivateRoute>
              <Caregivers />
            </PrivateRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <PrivateRoute>
              <Logs />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
