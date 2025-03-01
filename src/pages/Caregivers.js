// Example: Adding a dropdown column to assign an unassigned user to a caregiver
import React, { useState, useEffect } from 'react';
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove
} from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  DialogContentText
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { AiFillEdit, AiFillDelete } from 'react-icons/ai';
import Papa from 'papaparse';
import { getAuth } from 'firebase/auth';

export default function Caregivers() {
  // State for caregiver data
  const [caregivers, setCaregivers] = useState([]);
  // State for all users (to connect with caregivers)
  const [allUsers, setAllUsers] = useState([]);
  // State mapping: caregiver id → selected unassigned user id
  const [selectedUserForCaregiver, setSelectedUserForCaregiver] = useState({});

  // Other states (for manual add, edit, CSV, etc.)
  // … (existing state code)

  const auth = getAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch auth claims
  useEffect(() => {
    if (auth.currentUser) {
      auth.currentUser.getIdTokenResult()
        .then((idTokenResult) => {
          setIsAdmin(idTokenResult.claims.role === 'admin');
        })
        .catch((error) => {
          console.error('Error fetching token claims:', error);
        });
    }
  }, [auth.currentUser]);

  // Fetch caregivers data
  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers');
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all users data (for connecting)
  useEffect(() => {
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setAllUsers(list);
    });
    return () => unsubscribe();
  }, []);

  // List of users available for connection (those without a caregiverId)
  const unassignedUsers = allUsers.filter(user => !user.caregiverId);

  // Handler to connect a caregiver with a user
  const handleAssignUser = async (caregiverId, userId) => {
    if (!userId) return;
    try {
      await update(ref(db, `users/${userId}`), { caregiverId });
      toast.success('User connected successfully!');
      // Clear the dropdown for that caregiver
      setSelectedUserForCaregiver(prev => ({ ...prev, [caregiverId]: '' }));
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Error connecting user.');
    }
  };

  // ... (existing add/edit/delete and CSV functions)

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Manage Caregivers
      </Typography>

      {/* Existing UI elements for adding, editing, deleting caregivers */}
      {/* ... */}

      {/* Caregiver Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Connected Users</TableCell>
              <TableCell>Assign User</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {caregivers.map((cg) => {
              // Find users already connected to this caregiver
              const assignedUsers = allUsers.filter(
                (user) => user.caregiverId === cg.id
              );
              const assignedNames = assignedUsers.map(user => user.name).join(', ');
              return (
                <TableRow key={cg.id}>
                  <TableCell>{cg.id}</TableCell>
                  <TableCell>{cg.name}</TableCell>
                  <TableCell>{cg.email}</TableCell>
                  <TableCell>{assignedNames || 'None'}</TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Select
                        value={selectedUserForCaregiver[cg.id] || ''}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setSelectedUserForCaregiver(prev => ({ ...prev, [cg.id]: selected }));
                          handleAssignUser(cg.id, selected);
                        }}
                        displayEmpty
                        size="small"
                      >
                        <MenuItem value="">-- Select User --</MenuItem>
                        {unassignedUsers.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <>
                        <Button
                          variant="text"
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={() => {/* existing edit logic */}}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          color="error"
                          onClick={() => {/* existing delete confirmation logic */}}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
