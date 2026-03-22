// src/pages/MyUsers.js
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { Container, Typography, List, ListItem, ListItemText, Paper, CircularProgress, Box } from '@mui/material';

export default function MyUsers() {
  const { currentUser } = useAuth();
  const [myUsers, setMyUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const linkedUsers = Object.entries(data)
        .map(([id, user]) => ({ id, ...user }))
        .filter((user) => user.caregiverId === currentUser.uid);
      setMyUsers(linkedUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>My Users</Typography>
      {myUsers.length > 0 ? (
        <Paper>
          <List>
            {myUsers.map((user) => (
              <ListItem key={user.id}>
                <ListItemText primary={user.name || 'Unnamed'} secondary={user.email} />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography color="text.secondary">No users linked to you yet.</Typography>
      )}
    </Container>
  );
}
