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
import Papa from 'papaparse';
import { getAuth } from 'firebase/auth';

export default function Caregivers() {
  // State for caregiver data
  const [caregivers, setCaregivers] = useState([]);

  // Fields for adding a caregiver manually
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Editing state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // CSV file upload state
  const [csvFile, setCsvFile] = useState(null);

  // Role state: determine if the user is an admin
  const [isAdmin, setIsAdmin] = useState(false);
  const auth = getAuth();

  // Fetch the user's custom claims to determine admin status
  useEffect(() => {
    if (auth.currentUser) {
      auth.currentUser.getIdTokenResult()
        .then((idTokenResult) => {
          setIsAdmin(idTokenResult.claims.role === 'admin');
          console.log('User claims:', idTokenResult.claims);
        })
        .catch((error) => {
          console.error('Error fetching token claims:', error);
        });
    }
  }, [auth.currentUser]);

  // Listen to caregivers in real time
  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers');
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });
    return () => unsubscribe();
  }, []);

  // Function to add a caregiver (admin only)
  const handleAddCaregiver = async () => {
    if (!isAdmin) {
      toast.error('You do not have permission to add caregivers.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error('Please provide both name and email.');
      return;
    }
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
      console.error('Error adding caregiver:', error);
      toast.error('Error adding caregiver. Check console for details.');
    }
  };

  // Start editing a caregiver (admin only)
  const startEdit = (cg) => {
    if (!isAdmin) {
      toast.error('You do not have permission to edit caregivers.');
      return;
    }
    setEditId(cg.id);
    setEditName(cg.name);
    setEditEmail(cg.email);
  };

  // Update a caregiver (admin only)
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
      setEditId(null);
      setEditName('');
      setEditEmail('');
    } catch (error) {
      console.error('Error updating caregiver:', error);
      toast.error('Error updating caregiver. Check console for details.');
    }
  };

  // Confirm deletion (admin only)
  const confirmDelete = (id) => {
    if (!isAdmin) {
      toast.error('You do not have permission to delete caregivers.');
      return;
    }
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  // Delete a caregiver (admin only)
  const handleDeleteCaregiver = async () => {
    try {
      await remove(ref(db, `caregivers/${deleteTargetId}`));
      toast.success('Caregiver deleted successfully!');
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      toast.error('Error deleting caregiver. Check console for details.');
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  // Filter caregivers by search term
  const filteredCaregivers = caregivers.filter((cg) =>
    cg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cg.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle CSV file selection
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // Process CSV upload (admin only)
  const handleCSVUpload = () => {
    if (!isAdmin) {
      toast.error('You do not have permission to upload CSV data.');
      return;
    }
    if (!csvFile) {
      toast.error('Please select a CSV file first.');
      return;
    }
    Papa.parse(csvFile, {
      header: true,
      complete: (results) => {
        const data = results.data;
        data.forEach(async (row, index) => {
          if (row.name && row.email && /^\S+@\S+\.\S+$/.test(row.email)) {
            try {
              const newRef = push(ref(db, 'caregivers'));
              await set(newRef, { name: row.name, email: row.email });
            } catch (error) {
              console.error(`Error adding caregiver from CSV at row ${index + 1}:`, error);
              toast.error(`Error adding caregiver from CSV at row ${index + 1}.`);
            }
          } else {
            toast.error(`Invalid row data at row ${index + 1}: ${JSON.stringify(row)}`);
          }
        });
        toast.success('CSV upload completed.');
        setCsvFile(null);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file.');
      }
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Manage Caregivers
      </Typography>

      {/* Admin-only: Add new caregiver manually */}
      {isAdmin ? (
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
      ) : (
        <Typography variant="body1" color="error" sx={{ mb: 2 }}>
          You do not have admin privileges to add caregivers.
        </Typography>
      )}

      {/* CSV Upload (admin only) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        {isAdmin ? (
          <Button variant="outlined" onClick={handleCSVUpload}>
            Upload CSV
          </Button>
        ) : (
          <Typography variant="body2" color="error">
            CSV upload requires admin privileges.
          </Typography>
        )}
      </Box>

      {/* Search Field */}
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

      {/* Caregiver Table */}
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
                      {isAdmin ? (
                        <>
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
                        </>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Caregiver</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this caregiver? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteCaregiver}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
