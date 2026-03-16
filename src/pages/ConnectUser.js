// src/pages/ConnectUser.js
import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebaseConfig';
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
} from '@mui/material';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';

export default function ConnectUser() {
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const auth = getAuth();
  const currentUser = auth.currentUser; // Assumes the caregiver is logged in

  // Fetch users without a caregiverId (i.e. unassigned)
  useEffect(() => {
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .filter((user) => !user.caregiverId);
      setUnassignedUsers(list);
    });
    return () => unsubscribe();
  }, []);

  // Function for connecting the current caregiver to a user
  const connectUser = async (userId) => {
    if (!currentUser) {
      toast.error('You must be logged in to connect to a user.');
      return;
    }
    try {
      // Update the user's record by setting caregiverId to the current user's uid
      await update(ref(db, `users/${userId}`), { caregiverId: currentUser.uid });
      toast.success('User connected successfully!');
    } catch (error) {
      console.error('Error connecting user:', error);
      toast.error('Error connecting user.');
    }
  };

  // Filter unassigned users by search term
  const filteredUsers = unassignedUsers.filter((user) => {
    const userName = (user.name || '').toLowerCase();
    const userEmail = (user.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return userName.includes(search) || userEmail.includes(search);
  });

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Connect to a User
      </Typography>
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
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => connectUser(user.id)}
                  >
                    Connect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No unassigned users found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
