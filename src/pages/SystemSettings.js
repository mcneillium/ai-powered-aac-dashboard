// src/pages/SystemSettings.js
import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import { toast } from 'react-hot-toast';

const defaultConfig = {
  appName: 'CommAI',
  maxLogRetention: 30,
  enableNotifications: true,
  enableFineTuning: true,
  defaultGridSize: 3,
  defaultTheme: 'light',
  maxCachedLogs: 50,
  autoSyncInterval: 10,
  maintenanceMode: false,
};

export default function SystemSettings() {
  const [config, setConfig] = useState(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    get(ref(db, 'systemConfig')).then((snap) => {
      if (snap.exists()) {
        setConfig({ ...defaultConfig, ...snap.val() });
      }
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(db, 'systemConfig'), config);
      toast.success('Settings saved successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        System settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure global settings for the AAC system. Changes here affect both the mobile app and dashboard.
      </Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Settings saved successfully.</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>General</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="App name"
              fullWidth
              value={config.appName}
              onChange={(e) => update('appName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Log retention (days)"
              type="number"
              fullWidth
              value={config.maxLogRetention}
              onChange={(e) => update('maxLogRetention', parseInt(e.target.value) || 30)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Default grid size"
              type="number"
              fullWidth
              value={config.defaultGridSize}
              onChange={(e) => update('defaultGridSize', parseInt(e.target.value) || 3)}
              inputProps={{ min: 2, max: 6 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Auto-sync interval (minutes)"
              type="number"
              fullWidth
              value={config.autoSyncInterval}
              onChange={(e) => update('autoSyncInterval', parseInt(e.target.value) || 10)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Feature toggles</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={config.enableNotifications}
              onChange={(e) => update('enableNotifications', e.target.checked)}
              color="primary"
            />
          }
          label="Enable push notifications"
        />
        <br />
        <FormControlLabel
          control={
            <Switch
              checked={config.enableFineTuning}
              onChange={(e) => update('enableFineTuning', e.target.checked)}
              color="primary"
            />
          }
          label="Enable on-device fine-tuning"
        />
        <br />
        <FormControlLabel
          control={
            <Switch
              checked={config.maintenanceMode}
              onChange={(e) => update('maintenanceMode', e.target.checked)}
              color="warning"
            />
          }
          label="Maintenance mode (disables new logins)"
        />
      </Paper>

      <Button
        variant="contained"
        size="large"
        onClick={handleSave}
        disabled={saving}
        sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
      >
        {saving ? 'Saving...' : 'Save settings'}
      </Button>
    </Box>
  );
}
