// src/pages/UserSettings.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container, Typography, Paper, Box, Button,
  Table, TableBody, TableRow, TableCell, CircularProgress
} from '@mui/material';
import { DB_PATHS, SETTINGS_DEFAULTS, getUserDisplayName } from '../shared/schema';

export default function UserSettings() {
  const { userId } = useParams();
  const [settings, setSettings] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(ref(db, `${DB_PATHS.USERS}/${userId}`)).then(snap => {
      setUserData(snap.val());
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const settingsRef = ref(db, `${DB_PATHS.USER_SETTINGS}/${userId}`);
    const unsubscribe = onValue(settingsRef, (snap) => {
      setSettings(snap.val() || {});
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const merged = { ...SETTINGS_DEFAULTS, ...settings };

  const settingsRows = [
    { label: 'Theme', value: merged.theme },
    { label: 'Grid Size', value: `${merged.gridSize} columns` },
    { label: 'High Contrast', value: merged.contrast ? 'Enabled' : 'Disabled' },
    { label: 'Speech Rate', value: merged.speechRate },
    { label: 'Speech Pitch', value: merged.speechPitch },
    { label: 'Speech Voice', value: merged.speechVoice || 'System Default' },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">User Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            {userData ? getUserDisplayName(userData) : userId.slice(0, 8)}
            {userData?.email ? ` (${userData.email})` : ''}
          </Typography>
        </Box>
        <Button component={Link} to="/user-management" variant="outlined">
          Back to Users
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Current Preferences</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These settings are configured by the user in the AAC app.
        </Typography>
        <Table>
          <TableBody>
            {settingsRows.map(row => (
              <TableRow key={row.label}>
                <TableCell sx={{ fontWeight: 'bold', width: 200 }}>{row.label}</TableCell>
                <TableCell>{String(row.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
