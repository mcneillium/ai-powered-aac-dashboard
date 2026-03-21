// src/pages/ConnectUser.js
import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TextField,
  Alert,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';

export default function ConnectUser() {
  const { currentUser } = useAuth();
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'users/'), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter((user) => !user.caregiverId);
      setUnassignedUsers(list);
    });
    return () => unsubscribe();
  }, []);

  const connectUser = async (userId) => {
    if (!currentUser) {
      toast.error('You must be logged in.');
      return;
    }
    try {
      await update(ref(db, `users/${userId}`), { caregiverId: currentUser.uid });
      toast.success('User connected.');
    } catch {
      toast.error('Error connecting user.');
    }
  };

  const filteredUsers = unassignedUsers.filter((user) => {
    const s = searchTerm.toLowerCase();
    return (user.name || '').toLowerCase().includes(s)
      || (user.email || '').toLowerCase().includes(s);
  });

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Connect to Users</Typography>
        <Typography variant="body2" color="text.secondary">
          Assign unlinked users to yourself
        </Typography>
      </Box>

      <TextField
        placeholder="Search users..."
        size="small"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
      />

      {filteredUsers.length === 0 ? (
        <Alert severity="info">No unassigned users available.</Alert>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<LinkIcon />}
                        onClick={() => connectUser(user.id)}
                      >
                        Connect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}
