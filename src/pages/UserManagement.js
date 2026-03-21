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
  TableContainer,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TablePagination,
  Alert,
} from '@mui/material';
import { ref, onValue, push, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import SetPasswordForm from './SetPasswordForm';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [selectedCaregiverForUser, setSelectedCaregiverForUser] = useState({});
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCaregiverId, setNewUserCaregiverId] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users/'), (snap) => {
      const data = snap.val() || {};
      setUsers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
    const unsubCaregivers = onValue(ref(db, 'caregivers/'), (snap) => {
      const data = snap.val() || {};
      setCaregivers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
    return () => { unsubUsers(); unsubCaregivers(); };
  }, []);

  // Build caregiver lookup
  const caregiverMap = {};
  caregivers.forEach((c) => { caregiverMap[c.id] = c.name || c.email; });

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error('Please provide a name and email.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newUserEmail)) {
      toast.error('Invalid email format.');
      return;
    }
    try {
      await push(ref(db, 'users/'), {
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        caregiverId: newUserCaregiverId || null,
        createdAt: Date.now(),
      });
      toast.success('User added.');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserCaregiverId('');
      setShowAddForm(false);
    } catch (err) {
      toast.error('Error adding user.');
    }
  };

  const handleCSVUpload = () => {
    if (!csvFile) { toast.error('Select a CSV file first.'); return; }
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let added = 0;
        for (const row of results.data) {
          if (row.name && row.email) {
            try {
              await push(ref(db, 'users/'), {
                name: row.name.trim(),
                email: row.email.trim().toLowerCase(),
                caregiverId: row.caregiverId || null,
                createdAt: Date.now(),
              });
              added++;
            } catch { /* skip failed rows */ }
          }
        }
        toast.success(`${added} user(s) imported.`);
        setCsvFile(null);
      },
      error: () => toast.error('Error parsing CSV.'),
    });
  };

  const handleAssignCaregiverToUser = async (userId, caregiverId) => {
    try {
      await update(ref(db, `users/${userId}`), { caregiverId });
      toast.success('Caregiver assigned.');
      setSelectedCaregiverForUser((prev) => ({ ...prev, [userId]: '' }));
    } catch {
      toast.error('Error assigning caregiver.');
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (user.name || '').toLowerCase().includes(search)
      || (user.email || '').toLowerCase().includes(search);
  });

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            {users.length} total users, {users.filter((u) => !u.caregiverId).length} unassigned
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setShowAddForm(!showAddForm)}
            size="small"
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Add User Form */}
      {showAddForm && (
        <Paper sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Add New User
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField
              label="Name"
              size="small"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="Email"
              size="small"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Caregiver (optional)</InputLabel>
              <Select
                value={newUserCaregiverId}
                label="Caregiver (optional)"
                onChange={(e) => setNewUserCaregiverId(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {caregivers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name} ({c.email})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" size="small" onClick={handleAddUser}>Add</Button>
            <Button variant="outlined" size="small" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <UploadFileIcon color="action" />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              style={{ fontSize: 14 }}
            />
            <Button variant="outlined" size="small" onClick={handleCSVUpload} disabled={!csvFile}>
              Import CSV
            </Button>
          </Box>
        </Paper>
      )}

      {/* Search */}
      <TextField
        placeholder="Search by name or email..."
        size="small"
        fullWidth
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
      />

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Caregiver</TableCell>
                <TableCell>Assign Caregiver</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{user.name || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    {user.caregiverId ? (
                      <Chip label={caregiverMap[user.caregiverId] || user.caregiverId} size="small" />
                    ) : (
                      <Chip label="Unassigned" size="small" variant="outlined" color="warning" />
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <Select
                        value={selectedCaregiverForUser[user.id] || ''}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setSelectedCaregiverForUser((prev) => ({ ...prev, [user.id]: selected }));
                          handleAssignCaregiverToUser(user.id, selected);
                        }}
                        displayEmpty
                      >
                        <MenuItem value="">Select...</MenuItem>
                        {caregivers.map((cg) => (
                          <MenuItem key={cg.id} value={cg.id}>
                            {cg.name} ({cg.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedUserForPassword(user.id);
                          setPasswordModalOpen(true);
                        }}
                      >
                        Set Password
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/user-actions/${user.id}`)}
                      >
                        Actions
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No users found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[15, 30, 50]}
        />
      </Paper>

      {/* Password Modal */}
      <Dialog open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Password</DialogTitle>
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
