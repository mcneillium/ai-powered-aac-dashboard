// src/pages/MyUsers.js
import React, { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { Container, Typography, List, ListItem, ListItemText, Paper, CircularProgress, Box } from '@mui/material';

export default function MyUsers() {
  const { currentUser } = useAuth();
  const [myUsers, setMyUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Read assignments, then fetch each user individually
    const assignRef = ref(db, `caregiverAssignments/${currentUser.uid}`);
    const unsub = onValue(assignRef, async (snap) => {
      const assignments = snap.val() || {};
      const uids = Object.keys(assignments).filter((k) => assignments[k] === true);

      const users = [];
      for (const uid of uids) {
        try {
          const userSnap = await get(ref(db, `users/${uid}`));
          if (userSnap.exists()) {
            users.push({ id: uid, ...userSnap.val() });
          }
        } catch {
          // Permission denied or deleted — skip
        }
      }
      setMyUsers(users);
      setLoading(false);
    });

    return () => unsub();
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
        <Typography color="text.secondary">No users assigned to you yet.</Typography>
      )}
    </Container>
  );
}
