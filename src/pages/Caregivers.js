// src/pages/Caregivers.js
import React, { useEffect, useState } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
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
  DialogContentText,
  Select,
  MenuItem,
  FormControl,
  Container,
  Chip,
  TablePagination,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function Caregivers() {
  const { isAdmin } = useAuth();
  const [caregivers, setCaregivers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserForCaregiver, setSelectedUserForCaregiver] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    const unsubCg = onValue(ref(db, 'caregivers'), (snap) => {
      const data = snap.val() || {};
      setCaregivers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
    const unsubUsers = onValue(ref(db, 'users/'), (snap) => {
      const data = snap.val() || {};
      setAllUsers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
    return () => { unsubCg(); unsubUsers(); };
  }, []);

  const filteredCaregivers = caregivers.filter((cg) =>
    (cg.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cg.email || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const unassignedUsers = allUsers.filter((user) => !user.caregiverId);

  const handleAddCaregiver = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Invalid email format.');
      return;
    }
    try {
      const newRef = push(ref(db, 'caregivers'));
      await set(newRef, { name: name.trim(), email: email.trim().toLowerCase() });
      toast.success('Caregiver added.');
      setName('');
      setEmail('');
      setShowAddForm(false);
    } catch {
      toast.error('Error adding caregiver.');
    }
  };

  const handleUpdateCaregiver = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(editEmail)) {
      toast.error('Invalid email format.');
      return;
    }
    try {
      await update(ref(db, `caregivers/${editId}`), {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
      });
      toast.success('Caregiver updated.');
      setEditId(null);
    } catch {
      toast.error('Error updating caregiver.');
    }
  };

  const handleDeleteCaregiver = async () => {
    try {
      await remove(ref(db, `caregivers/${deleteTargetId}`));
      toast.success('Caregiver deleted.');
    } catch {
      toast.error('Error deleting caregiver.');
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const handleCSVUpload = () => {
    if (!csvFile) { toast.error('Select a CSV file first.'); return; }
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let added = 0;
        for (const row of results.data) {
          if (row.name && row.email && /^\S+@\S+\.\S+$/.test(row.email)) {
            try {
              await set(push(ref(db, 'caregivers')), {
                name: row.name.trim(),
                email: row.email.trim().toLowerCase(),
              });
              added++;
            } catch { /* skip */ }
          }
        }
        toast.success(`${added} caregiver(s) imported.`);
        setCsvFile(null);
      },
      error: () => toast.error('Error parsing CSV.'),
    });
  };

  const handleAssignUser = async (caregiverId, userId) => {
    if (!userId) return;
    try {
      await update(ref(db, `users/${userId}`), { caregiverId });
      toast.success('User connected.');
      setSelectedUserForCaregiver((prev) => ({ ...prev, [caregiverId]: '' }));
    } catch {
      toast.error('Error connecting user.');
    }
  };

  const paginatedCaregivers = filteredCaregivers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Caregiver Management</Typography>
          <Typography variant="body2" color="text.secondary">
            {caregivers.length} caregiver{caregivers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setShowAddForm(!showAddForm)}
            size="small"
          >
            Add Caregiver
          </Button>
        )}
      </Box>

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          View-only mode. Admin privileges required for modifications.
        </Alert>
      )}

      {/* Add Form */}
      {showAddForm && isAdmin && (
        <Paper sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Add Caregiver</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 180 }} />
            <TextField label="Email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ minWidth: 220 }} />
            <Button variant="contained" size="small" onClick={handleAddCaregiver}>Add</Button>
            <Button variant="outlined" size="small" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <UploadFileIcon color="action" />
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} style={{ fontSize: 14 }} />
            <Button variant="outlined" size="small" onClick={handleCSVUpload} disabled={!csvFile}>Import CSV</Button>
          </Box>
        </Paper>
      )}

      {/* Search */}
      <TextField
        placeholder="Search caregivers..."
        size="small"
        fullWidth
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
      />

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Connected Users</TableCell>
                {isAdmin && <TableCell>Assign User</TableCell>}
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCaregivers.map((cg) => {
                const assignedUsers = allUsers.filter((u) => u.caregiverId === cg.id);
                const isEditing = editId === cg.id;

                return (
                  <TableRow key={cg.id} hover>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : (
                        <Typography variant="body2" fontWeight={500}>{cg.name}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField size="small" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                      ) : (
                        cg.email
                      )}
                    </TableCell>
                    <TableCell>
                      {assignedUsers.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {assignedUsers.map((u) => (
                            <Chip key={u.id} label={u.name || u.email} size="small" variant="outlined" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">None</Typography>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <Select
                            value={selectedUserForCaregiver[cg.id] || ''}
                            onChange={(e) => {
                              const selected = e.target.value;
                              setSelectedUserForCaregiver((prev) => ({ ...prev, [cg.id]: selected }));
                              handleAssignUser(cg.id, selected);
                            }}
                            displayEmpty
                          >
                            <MenuItem value="">Select user...</MenuItem>
                            {unassignedUsers.map((u) => (
                              <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell align="right">
                        {isEditing ? (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Button size="small" variant="contained" onClick={handleUpdateCaregiver}>Save</Button>
                            <Button size="small" onClick={() => setEditId(null)}>Cancel</Button>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => { setEditId(cg.id); setEditName(cg.name); setEditEmail(cg.email); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => { setDeleteTargetId(cg.id); setDeleteDialogOpen(true); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filteredCaregivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 3} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No caregivers found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredCaregivers.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[15, 30, 50]}
        />
      </Paper>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Caregiver</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure? This will remove the caregiver but not their assigned users.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteCaregiver}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
