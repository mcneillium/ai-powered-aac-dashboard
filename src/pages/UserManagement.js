import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container, Typography, Box, Button, TextField, Paper, Table,
  TableHead, TableBody, TableRow, TableCell, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, TableContainer
} from '@mui/material';
import { ref, onValue, update, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import SetPasswordForm from './SetPasswordForm';
import { useNavigate, Link } from 'react-router-dom';
import { ROLES, DB_PATHS, getUserDisplayName } from '../shared/schema';
import PageSkeleton from '../components/PageSkeleton';

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        setAllUsers(Object.entries(data).map(([id, val]) => ({ id, ...val })));
        setLoading(false);
      },
      () => { setLoading(false); }
    );
    return () => { off(usersRef); unsubscribe(); };
  }, []);

  const caregivers = useMemo(
    () => allUsers.filter(u => u.role === ROLES.CAREGIVER || u.role === ROLES.ADMIN),
    [allUsers]
  );

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return allUsers.filter(user => {
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const matchesSearch = name.includes(search) || email.includes(search);
      const matchesRole = roleFilter === 'all' || (user.role || 'user') === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsers, searchTerm, roleFilter]);

  const handleAssignCaregiver = useCallback(async (userId, caregiverId) => {
    try {
      await update(ref(db, `${DB_PATHS.USERS}/${userId}`), {
        caregiverId: caregiverId || null
      });
      toast.success('Caregiver assigned successfully!');
    } catch {
      toast.error('Error assigning caregiver.');
    }
  }, []);

  const handleRoleChange = useCallback(async (userId, newRole) => {
    try {
      await update(ref(db, `${DB_PATHS.USERS}/${userId}`), { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch {
      toast.error('Error updating role.');
    }
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button component={Link} to="/admin" variant="outlined">
          Back to Dashboard
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Search by name or email"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={roleFilter}
            label="Role"
            onChange={(e) => setRoleFilter(e.target.value)}
            size="small"
          >
            <MenuItem value="all">All Roles</MenuItem>
            <MenuItem value={ROLES.USER}>Users</MenuItem>
            <MenuItem value={ROLES.CAREGIVER}>Caregivers</MenuItem>
            <MenuItem value={ROLES.ADMIN}>Admins</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Showing {filteredUsers.length} of {allUsers.length} users
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Assigned Caregiver</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{getUserDisplayName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role || ROLES.USER}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value={ROLES.USER}>User</MenuItem>
                    <MenuItem value={ROLES.CAREGIVER}>Caregiver</MenuItem>
                    <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.caregiverId || ''}
                    onChange={(e) => handleAssignCaregiver(user.id, e.target.value)}
                    displayEmpty
                    size="small"
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {caregivers
                      .filter(cg => cg.id !== user.id)
                      .map((cg) => (
                        <MenuItem key={cg.id} value={cg.id}>
                          {getUserDisplayName(cg)}
                        </MenuItem>
                      ))
                    }
                  </Select>
                </TableCell>
                <TableCell>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedUserForPassword(user.id);
                        setPasswordModalOpen(true);
                      }}
                    >
                      Password
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/user-actions/${user.id}`)}
                    >
                      Activity
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No users found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
