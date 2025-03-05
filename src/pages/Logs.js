// src/pages/Logs.js
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

export default function Logs() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [linkedUserIds, setLinkedUserIds] = useState([]);

  // For non-admin caregivers: fetch users linked to them
  useEffect(() => {
    if (!currentUser || isAdmin) return; // only run for non-admin caregivers
    const usersRef = ref(db, 'users/');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersArray = Object.entries(data).map(([id, user]) => ({ id, ...user }));
      const linkedUsers = usersArray.filter(user => user.caregiverId === currentUser.uid);
      const ids = linkedUsers.map(user => user.id);
      setLinkedUserIds(ids);
    });
    return () => unsubscribeUsers();
  }, [currentUser, isAdmin]);

  // Fetch logs and, if not admin, filter for logs belonging to linked users
  useEffect(() => {
    const logsRef = ref(db, 'userLogs');
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logsArray = Object.entries(data).map(([id, log]) => ({ id, ...log }));
      if (!isAdmin) {
        // If caregiver, show only logs for linked users
        const filteredLogs = logsArray.filter(log => linkedUserIds.includes(log.userId));
        setLogs(filteredLogs);
      } else {
        // Admin sees all logs
        setLogs(logsArray);
      }
    });
    return () => unsubscribeLogs();
  }, [linkedUserIds, isAdmin]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Logs
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell><strong>User ID</strong></TableCell>
              <TableCell><strong>Log ID</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.userId}</TableCell>
                <TableCell>{log.id}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No logs found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
