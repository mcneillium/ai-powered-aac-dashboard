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

export default function Caregivers() {
  // Caregiver data from DB
  const [caregivers, setCaregivers] = useState([]);

  // Fields for adding a caregiver manually
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

  // CSV file upload state
  const [csvFile, setCsvFile] = useState(null);

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

  // 2) Create a new caregiver manually
  const handleAddCaregiver = async () => {
    console.log('Add caregiver clicked', { name, email });
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
      console.log('Firebase ref created:', newRef.key);
      await set(newRef, { name, email });
      toast.success('Caregiver added successfully!');
      setName('');
      setEmail('');
    } catch (error) {
      console.error('Error adding caregiver:', error);
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
      setEditId(null);
      setEditName('');
      setEditEmail('');
    } catch (error) {
      console.error('Error updating caregiver:', error);
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
      console.error('Error deleting caregiver:', error);
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

  // 7) Handle CSV file selection
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  // 8) Process the CSV upload and add caregivers
  const handleCSVUpload = () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first.');
      return;
    }
    Papa.parse(csvFile, {
      header: true,
      complete: (results) => {
        console.log('CSV Results:', results);
        const data = results.data;
        data.forEach(async (row, index) => {
          // Check if row has required fields and a valid email
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

      {/* ADD NEW CAREGIVER MANUALLY */}
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

      {/* CSV UPLOAD */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <Button variant="outlined" onClick={handleCSVUpload}>
          Upload CSV
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
