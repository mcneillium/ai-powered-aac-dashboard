import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Caregiver Dashboard - Home</h1>
      <nav>
        <Link to="/caregivers" style={{ marginRight: 16 }}>Manage Caregivers</Link>
        <Link to="/logs">View User Logs</Link>
      </nav>
    </div>
  );
}
