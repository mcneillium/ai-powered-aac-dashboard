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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { ref, onValue, push, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import SetPasswordForm from './SetPasswordForm';
import { useNavigate } from 'react-router-dom';

export default function UserManagement() {
  // State for users and caregivers
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  
  // For caregiver assignment dropdown per user
  const [selectedCaregiverForUser, setSelectedCaregiverForUser] = useState({});
  
  // States for manually adding a new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCaregiverId, setNewUserCaregiverId] = useState('');
  
  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  
  // Search field state
  const [searchTerm, setSearchTerm] = useState('');

  // State for password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);

  const navigate = useNavigate();

  // Fetch users from the "users" node
  useEffect(() => {
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

  // Fetch caregivers from the "caregivers" node
  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers/');
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });
    return () => unsubscribe();
  }, []);

  // Handler to manually add a new user (caregiverId is optional)
  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error('Please provide a name and an email.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newUserEmail)) {
      toast.error('Invalid email format.');
      return;
    }
    try {
      await push(ref(db, 'users/'), {
        name: newUserName,
        email: newUserEmail,
        caregiverId: newUserCaregiverId ? newUserCaregiverId : null
      });
      toast.success('User added successfully!');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserCaregiverId('');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error adding user.');
    }
  };

  // CSV upload handler: expects CSV with headers: name, email, and optionally caregiverId
  const handleCSVUpload = () => {
    if (!csvFile) {
      toast.error('Please select a CSV file.');
      return;
    }
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        for (const [index, row] of data.entries()) {
          if (row.name && row.email) {
            try {
              await push(ref(db, 'users/'), {
                name: row.name,
                email: row.email,
                caregiverId: row.caregiverId ? row.caregiverId : null
              });
            } catch (error) {
              console.error(`Error adding user from CSV at row ${index + 1}:`, error);
              toast.error(`Error adding CSV row ${index + 1}.`);
            }
          } else {
            toast.error(`Invalid row data at row ${index + 1}: ${JSON.stringify(row)}`);
          }
        }
        toast.success('CSV upload complete.');
        setCsvFile(null);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Error parsing CSV.');
      }
    });
  };

  // Assign caregiver from the dropdown for a user
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

  // Filter users based on search term, defaulting missing values to empty strings
  const filteredUsers = users.filter((user) => {
    const userName = user.name || "";
    const userEmail = user.email || "";
    const search = searchTerm.toLowerCase();
    return userName.toLowerCase().includes(search) || userEmail.toLowerCase().includes(search);
  });

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {/* Manual Add New User Section */}
      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Add New User</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <TextField
            label="Name"
            variant="outlined"
            size="small"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <TextField
            label="Email"
            variant="outlined"
            size="small"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <TextField
            label="Caregiver ID (optional)"
            variant="outlined"
            size="small"
            value={newUserCaregiverId}
            onChange={(e) => setNewUserCaregiverId(e.target.value)}
          />
          <Button variant="contained" size="small" onClick={handleAddUser}>
            Add User
          </Button>
        </Box>
      </Box>

      {/* CSV Upload Section */}
      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">CSV Upload</Typography>
        <Box sx={{ mt: 2 }}>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
            style={{ marginBottom: 16 }}
          />
          <Button variant="outlined" onClick={handleCSVUpload}>
            Upload CSV
          </Button>
        </Box>
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

      {/* Users Table with Caregiver Assignment Dropdown, Set Password Button, and View Actions */}
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
              <TableCell>Set Password</TableCell>
              <TableCell>View Actions</TableCell>
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
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      setSelectedUserForPassword(user.id);
                      setPasswordModalOpen(true);
                    }}
                  >
                    Set Password
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/user-actions/${user.id}`)}
                  >
                    View Actions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No users found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Set Password Modal */}
      <Dialog open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)}>
        <DialogTitle>Set Password for User {selectedUserForPassword}</DialogTitle>
        <DialogContent>
          <SetPasswordForm
            prefilledUid={selectedUserForPassword}
            onClose={() => setPasswordModalOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
