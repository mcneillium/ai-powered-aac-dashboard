// src/pages/ConnectUser.js
// Admin-only: assigns users to caregivers via /caregiverAssignments
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';

export default function ConnectUser() {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val() || {};
      setUsers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
    const unsubCg = onValue(ref(db, 'caregivers'), (snap) => {
      const data = snap.val() || {};
      setCaregivers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
    return () => { unsubUsers(); unsubCg(); };
  }, [isAdmin]);

  const unassignedUsers = users.filter((u) => !u.caregiverId);

  const assignUser = async (userId) => {
    if (!currentUser || !selectedCaregiver) {
      toast.error('Select a caregiver first.');
      return;
    }
    try {
      // Atomic multi-path update: set both the user's caregiverId
      // and the caregiverAssignments entry in one write
      const updates = {};
      updates[`users/${userId}/caregiverId`] = selectedCaregiver;
      updates[`caregiverAssignments/${selectedCaregiver}/${userId}`] = true;
      await update(ref(db), updates);
      toast.success('User assigned to caregiver.');
    } catch (err) {
      toast.error('Error assigning user: ' + (err.message || ''));
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="warning">
          User assignment is admin-only. Ask an admin to assign users to your account.
        </Alert>
      </Container>
    );
  }

  const filteredUsers = unassignedUsers.filter((user) => {
    const s = searchTerm.toLowerCase();
    return (user.name || '').toLowerCase().includes(s)
      || (user.email || '').toLowerCase().includes(s);
  });

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Assign Users to Caregivers</Typography>
        <Typography variant="body2" color="text.secondary">
          Select a caregiver, then assign unlinked users
        </Typography>
      </Box>

      <FormControl fullWidth sx={{ mb: 2 }} size="small">
        <InputLabel>Assign to caregiver</InputLabel>
        <Select
          value={selectedCaregiver}
          label="Assign to caregiver"
          onChange={(e) => setSelectedCaregiver(e.target.value)}
        >
          {caregivers.map((cg) => (
            <MenuItem key={cg.id} value={cg.id}>
              {cg.name || cg.email || cg.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
                        onClick={() => assignUser(user.id)}
                        disabled={!selectedCaregiver}
                      >
                        Assign
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
