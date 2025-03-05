// src/pages/UserActions.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';

export default function UserActions() {
  const { userId } = useParams(); // Expected to be the target user's ID
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const logsRef = ref(db, 'userLogs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logsArray = Object.entries(data).map(([id, log]) => ({ id, ...log }));
      // Filter logs by the targetUserId field
      const filteredLogs = logsArray.filter((log) => log.targetUserId === userId);
      setLogs(filteredLogs);
    });
    return () => unsubscribe();
  }, [userId]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Actions for User: {userId}
      </Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Target User ID</strong></TableCell>
              <TableCell><strong>Carer ID</strong></TableCell>
              <TableCell><strong>Log ID</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.targetUserId}</TableCell>
                  <TableCell>{log.carerId}</TableCell>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>No actions found for this user.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
