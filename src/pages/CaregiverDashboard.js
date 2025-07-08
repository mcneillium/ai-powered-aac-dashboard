// src/pages/CaregiverDashboard.js
import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container,
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend
} from 'recharts';

// Helper to export CSV
function exportCsv(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','),
    ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CaregiverDashboard() {
  // State
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [vocab, setVocab] = useState([]);
  const [alerts, setAlerts] = useState({ inactivity: false, threshold: 10 });

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [actionFilter, setActionFilter] = useState('');

  // Fetch real-time clients
  useEffect(() => {
    const unsub = onValue(ref(db, 'clients'), snap => {
      const data = snap.val() || {};
      setClients(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return () => unsub();
  }, []);

  // Fetch real-time logs
  useEffect(() => {
    const unsub = onValue(ref(db, 'userLogs'), snap => {
      const data = snap.val() || {};
      let arr = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(arr);
    });
    return () => unsub();
  }, []);

  // Fetch real-time vocabulary
  useEffect(() => {
    const unsub = onValue(ref(db, 'vocabulary'), snap => {
      const data = snap.val() || {};
      setVocab(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return () => unsub();
  }, []);

  // Fetch alerts settings
  useEffect(() => {
    const unsub = onValue(ref(db, 'alertSettings'), snap => {
      const data = snap.val() || {};
      setAlerts({
        inactivity: data.inactivity ?? false,
        threshold: data.threshold ?? 10
      });
    });
    return () => unsub();
  }, []);

  // Filter clients
  const filteredClients = useMemo(
    () => clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  );

  // Filter logs
  const filteredLogs = useMemo(
    () =>
      logs.filter(l => {
        if (startDate && new Date(l.timestamp) < new Date(startDate)) return false;
        if (endDate && new Date(l.timestamp) > new Date(endDate)) return false;
        if (actionFilter && !l.action?.toLowerCase().includes(actionFilter.toLowerCase())) return false;
        return true;
      }),
    [logs, startDate, endDate, actionFilter]
  );

  // Compute stats
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const today = new Date();
    const upcoming = clients.filter(c => new Date(c.nextSession) >= today).length;
    const totalEvents = logs.length;
    const symbolCounts = {};
    logs.forEach(l => { if (l.symbol) symbolCounts[l.symbol] = (symbolCounts[l.symbol] || 0) + 1; });
    const topSymbol = Object.entries(symbolCounts).reduce((m, [k, v]) => (v > m[1] ? [k, v] : m), ['', 0])[0];
    return { totalClients, upcoming, totalEvents, topSymbol };
  }, [clients, logs]);

  // Usage over time
  const usageMetrics = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
      const d = new Date(l.timestamp).toLocaleDateString();
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [logs]);

  // Symbol frequency for bar chart
  const symbolFreq = useMemo(() => {
    const counts = {};
    logs.forEach(l => { if (l.symbol) counts[l.symbol] = (counts[l.symbol] || 0) + 1; });
    return Object.entries(counts)
      .map(([sym, cnt]) => ({ sym, cnt }))
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 10);
  }, [logs]);

  // Vocabulary CRUD handlers
  const addWord = () => {
    const word = prompt('New word:');
    if (word) push(ref(db, 'vocabulary'), { word });
  };
  const editWord = item => {
    const word = prompt('Edit word:', item.word);
    if (word) update(ref(db, `vocabulary/${item.id}`), { word });
  };
  const deleteWord = id => {
    if (window.confirm('Delete this word?')) remove(ref(db, `vocabulary/${id}`));
  };

  // Alerts update
  const toggleInactivity = () => {
    update(ref(db, 'alertSettings'), { inactivity: !alerts.inactivity });
  };
  const setThreshold = val => {
    update(ref(db, 'alertSettings'), { threshold: Number(val) });
  };

  return (
    <Container sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Caregiver Dashboard</Typography>
        <Button variant="contained" color="primary" onClick={() => { /* new client logic */ }}>
          New Client
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} mb={4}>
        {[
          { label: 'Total Clients', value: stats.totalClients },
          { label: 'Upcoming Sessions', value: stats.upcoming },
          { label: 'Total Events', value: stats.totalEvents },
          { label: 'Top Symbol', value: stats.topSymbol || '—' }
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{c.label}</Typography>
                <Typography variant="h5">{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Usage Over Time" />
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={usageMetrics}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ReTooltip />
                  <Line type="monotone" dataKey="count" stroke="#1976d2" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Top Symbols" />
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={symbolFreq}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sym" />
                  <YAxis />
                  <Legend />
                  <ReTooltip />
                  <Bar dataKey="cnt" fill="#388e3c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Logs Feed */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Activity Feed & Filters" />
        <CardContent>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <TextField
              size="small"
              label="Action"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start"
                value={startDate}
                onChange={setStartDate}
                renderInput={params => <TextField size="small" {...params} />}
              />
              <DatePicker
                label="End"
                value={endDate}
                onChange={setEndDate}
                renderInput={params => <TextField size="small" {...params} />}
              />
            </LocalizationProvider>
            <Button onClick={() => exportCsv(filteredLogs, 'logs.csv')}>Export Logs</Button>
          </Box>
          <TableContainer component={Paper} elevation={1} sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Symbol</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell>{new Date(l.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{l.userId}</TableCell>
                    <TableCell>{l.action}</TableCell>
                    <TableCell>{l.symbol || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Vocabulary Manager */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title="Vocabulary Manager"
          action={<Button onClick={addWord}>+ Add Word</Button>}
        />
        <CardContent>
          <List>
            {vocab.map(item => (
              <ListItem key={item.id} divider>
                <ListItemText primary={item.word} />
                <Box>
                  <Button size="small" onClick={() => editWord(item)}>Edit</Button>
                  <Button size="small" onClick={() => deleteWord(item.id)}>Delete</Button>
                </Box>
              </ListItem>
            ))}
            {vocab.length === 0 && <Typography>No vocabulary defined.</Typography>}
          </List>
        </CardContent>
      </Card>

      {/* Alerts Settings */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Alert Settings" />
        <CardContent>
          <FormControlLabel
            control={<Switch checked={alerts.inactivity} onChange={toggleInactivity} />}
            label="Inactivity Alert"
          />
          <TextField
            type="number"
            label="Inactivity Threshold (min)"
            value={alerts.threshold}
            onChange={e => setThreshold(e.target.value)}
            size="small"
            sx={{ ml: 2 }}
          />
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader
          title="Client List"
          action={
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          }
        />
        <CardContent>
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Next Session</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map(c => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.id}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.nextSession}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            c.status === 'Critical'
                              ? 'error'
                              : c.status === 'Monitoring'
                              ? 'warning.main'
                              : 'success.main'
                          }
                        >
                          {c.status}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No clients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
}