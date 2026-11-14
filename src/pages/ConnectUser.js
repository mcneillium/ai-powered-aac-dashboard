import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, update, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Box, Button, Table, TableContainer,
  TableHead, TableRow, TableCell, TableBody, Paper, TextField, Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { DB_PATHS, ROLES, getUserDisplayName } from '../shared/schema';

export default function ConnectUser() {
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .filter((user) => !user.caregiverId && user.role !== ROLES.ADMIN && user.role !== ROLES.CAREGIVER);
        setUnassignedUsers(list);
        setError(null);
      },
      () => { setError('Failed to load users.'); }
    );
    return () => { off(usersRef); unsubscribe(); };
  }, []);

  const connectUser = useCallback(async (userId) => {
    if (!currentUser) {
      toast.error('You must be logged in to connect to a user.');
      return;
    }
    try {
      await update(ref(db, `${DB_PATHS.USERS}/${userId}`), {
        caregiverId: currentUser.uid
      });
      toast.success('User connected successfully!');
    } catch {
      toast.error('Error connecting user.');
    }
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return unassignedUsers.filter((user) => {
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [unassignedUsers, searchTerm]);

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Connect to a User</Typography>
        <Button component={Link} to="/caregiver" variant="outlined">
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <TextField
          label="Search Unassigned Users"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{getUserDisplayName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Button variant="contained" size="small" onClick={() => connectUser(user.id)}>
                    Connect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  {unassignedUsers.length === 0
                    ? 'All users are already assigned to a caregiver.'
                    : 'No matching users found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
