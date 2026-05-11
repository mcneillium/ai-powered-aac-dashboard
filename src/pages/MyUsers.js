import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, List, ListItem, ListItemText,
  Paper, Button, Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DB_PATHS, getUserDisplayName } from '../shared/schema';
import PageSkeleton from '../components/PageSkeleton';

export default function MyUsers() {
  const { currentUser } = useAuth();
  const [myUsers, setMyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const linked = Object.entries(data)
          .map(([id, user]) => ({ id, ...user }))
          .filter(user => user.caregiverId === currentUser.uid);
        setMyUsers(linked);
        setError(null);
        setLoading(false);
      },
      () => {
        setError('Failed to load users.');
        setLoading(false);
      }
    );
    return () => { off(usersRef); unsubscribe(); };
  }, [currentUser]);

  if (loading) return <PageSkeleton />;

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        My Users
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {myUsers.length > 0 ? (
        <List>
          {myUsers.map(user => (
            <ListItem key={user.id}>
              <ListItemText
                primary={getUserDisplayName(user)}
                secondary={user.email}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(`/user-actions/${user.id}`)}
              >
                View activity
              </Button>
            </ListItem>
          ))}
        </List>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No users linked to you yet.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/connect-user')}>
            Connect a user
          </Button>
        </Paper>
      )}
    </Container>
  );
}
