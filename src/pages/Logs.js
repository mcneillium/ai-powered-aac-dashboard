import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database'; // If using Firebase
import { db } from '../firebaseConfig';

export default function Logs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const logsRef = ref(db, 'userLogs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setLogs(list);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>User Logs</h2>
      <table style={{ marginTop: 20, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Log ID</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Action</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{log.id}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{log.action}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
