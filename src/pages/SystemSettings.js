// src/pages/SystemSettings.js
import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebaseConfig';
import { DB_PATHS } from '../shared/schema';
import {
  Typography, Box, Paper, TextField, Button, Switch,
  FormControlLabel, Grid, Alert, Slider
} from '@mui/material';
import { toast } from 'react-hot-toast';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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
  alertOnDistress: true,
  alertOnInactivity: true,
  inactivityThresholdHours: 24,
  defaultSpeechRate: 1.0,
  defaultSpeechPitch: 1.0,
};

const APP_VERSION = '0.1.0';

export default function SystemSettings() {
  const [config, setConfig] = useState(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    get(ref(db, DB_PATHS.SYSTEM_CONFIG))
      .then((snap) => {
        if (snap.exists()) {
          setConfig({ ...defaultConfig, ...snap.val() });
        }
      })
      .catch(() => {
        setLoadError('Failed to load system settings.');
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(db, DB_PATHS.SYSTEM_CONFIG), config);
      toast.success('Settings saved successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error('Failed to save settings');
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

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Settings saved successfully.</Alert>}

      {/* General */}
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
              label="Max cached logs (per device)"
              type="number"
              fullWidth
              value={config.maxCachedLogs}
              onChange={(e) => update('maxCachedLogs', parseInt(e.target.value) || 50)}
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

      {/* Default user settings template */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Default user settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These defaults are applied to newly created users on the mobile app.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Default grid size"
              type="number"
              fullWidth
              value={config.defaultGridSize}
              onChange={(e) => update('defaultGridSize', parseInt(e.target.value) || 3)}
              inputProps={{ min: 2, max: 6 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>Speech rate: {config.defaultSpeechRate}</Typography>
            <Slider
              value={config.defaultSpeechRate}
              onChange={(_, v) => update('defaultSpeechRate', v)}
              min={0.5} max={1.5} step={0.1}
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>Speech pitch: {config.defaultSpeechPitch}</Typography>
            <Slider
              value={config.defaultSpeechPitch}
              onChange={(_, v) => update('defaultSpeechPitch', v)}
              min={0.5} max={1.5} step={0.1}
              valueLabelDisplay="auto"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Alert & notification preferences */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Alerts &amp; notifications</Typography>
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
              checked={config.alertOnDistress}
              onChange={(e) => update('alertOnDistress', e.target.checked)}
              color="primary"
            />
          }
          label="Alert caregivers on distress signals"
        />
        <br />
        <FormControlLabel
          control={
            <Switch
              checked={config.alertOnInactivity}
              onChange={(e) => update('alertOnInactivity', e.target.checked)}
              color="primary"
            />
          }
          label="Alert caregivers on user inactivity"
        />
        {config.alertOnInactivity && (
          <Box sx={{ ml: 4, mt: 1, maxWidth: 300 }}>
            <TextField
              label="Inactivity threshold (hours)"
              type="number"
              size="small"
              fullWidth
              value={config.inactivityThresholdHours}
              onChange={(e) => update('inactivityThresholdHours', parseInt(e.target.value) || 24)}
              inputProps={{ min: 1, max: 168 }}
            />
          </Box>
        )}
      </Paper>

      {/* Feature toggles */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Feature toggles</Typography>
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
        sx={{ mb: 4 }}
      >
        {saving ? 'Saving...' : 'Save settings'}
      </Button>

      {/* About section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoOutlinedIcon color="primary" />
          <Typography variant="h6">About</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">Dashboard version</Typography>
            <Typography variant="body1" fontWeight={600}>{APP_VERSION}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">Project ID</Typography>
            <Typography variant="body1" fontWeight={600}>
              {process.env.REACT_APP_FIREBASE_PROJECT_ID || '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">Auth domain</Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
              {process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">Database URL</Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
              {process.env.REACT_APP_FIREBASE_DATABASE_URL || '—'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
