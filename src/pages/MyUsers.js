// src/pages/MyUsers.js
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Container, Typography, List, ListItem, ListItemText } from '@mui/material';
import { getAuth } from 'firebase/auth';

export default function MyUsers() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [myUsers, setMyUsers] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Convert the users object into an array and filter for users linked to the current caregiver
      const usersArray = Object.entries(data).map(([id, user]) => ({ id, ...user }));
      const linkedUsers = usersArray.filter(user => user.caregiverId === currentUser.uid);
      setMyUsers(linkedUsers);
    });
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        My Users
      </Typography>
      {myUsers.length > 0 ? (
        <List>
          {myUsers.map(user => (
            <ListItem key={user.id}>
              <ListItemText primary={user.name} secondary={user.email} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2">No users linked to you yet.</Typography>
      )}
    </Container>
  );
}
