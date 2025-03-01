// src/pages/UserManagement.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
} from '@mui/material';
import { ref, onValue, push, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [selectedCaregiverForUser, setSelectedCaregiverForUser] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch users
  useEffect(() => {
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

  // Fetch caregivers
  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers');
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });
    return () => unsubscribe();
  }, []);

  const handleAssignCaregiverToUser = async (userId, caregiverId) => {
    try {
      await update(ref(db, `users/${userId}`), { caregiverId });
      toast.success('Caregiver assigned successfully!');
      setSelectedCaregiverForUser(prev => ({ ...prev, [userId]: '' }));
    } catch (error) {
      console.error('Error assigning caregiver:', error);
      toast.error('Error assigning caregiver.');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Search by name or email"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </Box>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          User List
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Assigned Caregiver</TableCell>
              <TableCell>Assign Caregiver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.caregiverId || 'None'}</TableCell>
                <TableCell>
                  <Select
                    value={selectedCaregiverForUser[user.id] || ''}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setSelectedCaregiverForUser(prev => ({ ...prev, [user.id]: selected }));
                      handleAssignCaregiverToUser(user.id, selected);
                    }}
                    displayEmpty
                    size="small"
                  >
                    <MenuItem value="">-- Select Caregiver --</MenuItem>
                    {caregivers.map((cg) => (
                      <MenuItem key={cg.id} value={cg.id}>
                        {cg.name} ({cg.email})
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
// In the code snippet above, we have implemented the User Management page. This page displays a list of users and allows an admin to assign a caregiver to each user. The admin can search for users by name or email and assign a caregiver from the list of caregivers.
