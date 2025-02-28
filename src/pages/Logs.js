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
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Logs
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell><strong>Log ID</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell><strong>Timestamp</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.id}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.timestamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
