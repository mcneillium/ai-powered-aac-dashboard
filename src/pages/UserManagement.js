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
} from '@mui/material';
import { ref, onValue, push } from 'firebase/database';
import { db } from '../firebaseConfig';
import Papa from 'papaparse';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCaregiverId, setNewUserCaregiverId] = useState(''); // New field for caregiver connection

  useEffect(() => {
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setUsers(list);
      } else {
        setUsers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserCaregiverId) {
      alert('Please enter name, email, and caregiver ID.');
      return;
    }
    try {
      await push(ref(db, 'users/'), { 
        name: newUserName, 
        email: newUserEmail, 
        caregiverId: newUserCaregiverId 
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserCaregiverId('');
    } catch (error) {
      alert('Error adding user: ' + error.message);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data } = results;
        for (const row of data) {
          // Expecting CSV with headers "name", "email", and "caregiverId"
          if (row.name && row.email && row.caregiverId) {
            try {
              await push(ref(db, 'users/'), { 
                name: row.name, 
                email: row.email, 
                caregiverId: row.caregiverId 
              });
            } catch (error) {
              console.error('Error adding user from CSV:', error);
            }
          }
        }
        alert('CSV upload complete.');
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      },
    });
  };

  const addDummyUsers = async () => {
    const dummyUsers = [
      { name: 'Alice', email: 'alice@example.com', caregiverId: 'carer123' },
      { name: 'Bob', email: 'bob@example.com', caregiverId: 'carer123' },
      { name: 'Charlie', email: 'charlie@example.com', caregiverId: 'carer456' },
    ];
    try {
      for (const user of dummyUsers) {
        await push(ref(db, 'users/'), user);
      }
      alert('Dummy users added.');
    } catch (error) {
      alert('Error adding dummy users: ' + error.message);
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      
      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Add New User</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <TextField
            label="Name"
            variant="outlined"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <TextField
            label="Email"
            variant="outlined"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <TextField
            label="Caregiver ID"
            variant="outlined"
            value={newUserCaregiverId}
            onChange={(e) => setNewUserCaregiverId(e.target.value)}
          />
          <Button variant="contained" onClick={handleAddUser}>
            Add User
          </Button>
        </Box>
      </Box>
      
      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">CSV Upload</Typography>
        <Box sx={{ mt: 2 }}>
          <input
            accept=".csv"
            type="file"
            onChange={handleCSVUpload}
            style={{ marginBottom: 16 }}
          />
        </Box>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Button variant="outlined" onClick={addDummyUsers}>
          Add Dummy Users
        </Button>
      </Box>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          User List
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Caregiver ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.caregiverId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
