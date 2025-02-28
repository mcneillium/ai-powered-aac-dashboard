// src/pages/Caregivers.js

import React, { useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  DialogContentText
} from '@mui/material';

import { toast } from 'react-hot-toast';
import { AiFillEdit, AiFillDelete } from 'react-icons/ai';

export default function Caregivers() {
  // Caregiver data from DB
  const [caregivers, setCaregivers] = useState([]);

  // Fields for adding a caregiver
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Editing states
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // 1) Listen to caregivers in real-time from the DB
  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers');
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });

    return () => unsubscribe();
  }, []);

  // 2) Create a new caregiver
  const handleAddCaregiver = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Please provide both name and email.');
      return;
    }
    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Invalid email format');
      return;
    }

    try {
      const newRef = push(ref(db, 'caregivers'));
      await set(newRef, { name, email });
      toast.success('Caregiver added successfully!');
      setName('');
      setEmail('');
    } catch (error) {
      console.error(error);
      toast.error('Error adding caregiver. Check console for details.');
    }
  };

  // 3) Begin editing a caregiver
  const startEdit = (cg) => {
    setEditId(cg.id);
    setEditName(cg.name);
    setEditEmail(cg.email);
  };

  // 4) Update caregiver
  const handleUpdateCaregiver = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Please provide both name and email.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(editEmail)) {
      toast.error('Invalid email format');
      return;
    }

    try {
      await update(ref(db, `caregivers/${editId}`), {
        name: editName,
        email: editEmail
      });
      toast.success('Caregiver updated successfully!');
      // Clear edit fields
      setEditId(null);
      setEditName('');
      setEditEmail('');
    } catch (error) {
      console.error(error);
      toast.error('Error updating caregiver. Check console for details.');
    }
  };

  // 5) Open delete confirmation dialog
  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  // 5a) Execute the actual delete
  const handleDeleteCaregiver = async () => {
    try {
      await remove(ref(db, `caregivers/${deleteTargetId}`));
      toast.success('Caregiver deleted successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting caregiver. Check console for details.');
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  // 6) Filter caregivers by search term
  const filteredCaregivers = caregivers.filter((cg) =>
    cg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cg.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Manage Caregivers
      </Typography>

      {/* ADD NEW CAREGIVER */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Name"
          variant="outlined"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          variant="outlined"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button variant="contained" onClick={handleAddCaregiver}>
          Add Caregiver
        </Button>
      </Box>

      {/* SEARCH FIELD */}
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

      {/* CAREGIVER TABLE */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f2f2f2' }}>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCaregivers.map((cg) => (
              <TableRow key={cg.id}>
                <TableCell>{cg.id}</TableCell>

                {/* If the row is in edit mode */}
                {editId === cg.id ? (
                  <>
                    <TableCell>
                      <TextField
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={handleUpdateCaregiver}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{cg.name}</TableCell>
                    <TableCell>{cg.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        startIcon={<AiFillEdit />}
                        sx={{ mr: 1 }}
                        onClick={() => startEdit(cg)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        startIcon={<AiFillDelete />}
                        onClick={() => confirmDelete(cg.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Caregiver</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this caregiver? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={handleDeleteCaregiver}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
