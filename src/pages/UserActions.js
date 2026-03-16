// src/pages/UserActions.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, CircularProgress, Box } from '@mui/material';

export default function UserActions() {
  const { userId } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsQuery = query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(500));
    const unsubscribe = onValue(logsQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const logsArray = Object.entries(data).map(([id, log]) => ({ id, ...log }));
      // Filter logs where:
      // - If the log has a targetUserId, then it must equal the userId from the URL.
      // - Otherwise, if it doesn't have targetUserId, fall back to comparing log.userId.
      const filteredLogs = logsArray.filter((log) => {
        if (log.targetUserId !== undefined) {
          return log.targetUserId === userId;
        }
        return log.userId === userId;
      });
      setLogs(filteredLogs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Actions for User: {userId}
      </Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>{'Target User ID / User ID'}</strong></TableCell>
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
                  <TableCell>{log.targetUserId || log.userId}</TableCell>
                  <TableCell>{log.carerId || 'N/A'}</TableCell>
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
