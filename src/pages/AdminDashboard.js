// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Link } from 'react-router-dom';
import {
  Container, Typography, Box, Button, ButtonGroup, TextField,
  FormControl, InputLabel, Select, MenuItem, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Card, CardContent, Snackbar, CircularProgress, Grid, Chip
} from '@mui/material';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title,
  Tooltip as ChartTooltip, Legend, Filler
} from 'chart.js';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ROLES, DB_PATHS, getUserDisplayName, getLogUserId } from '../shared/schema';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, ChartTooltip, Legend, Filler
);

const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  plugins: {
    legend: { position: 'top' },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 } }
  }
};

export default function AdminDashboard() {
  const [viewType, setViewType] = useState('users');
  const [allUsers, setAllUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFrame, setTimeFrame] = useState('week');

  // Derive users and caregivers from the unified users collection
  const users = useMemo(
    () => allUsers.filter(u => u.role === ROLES.USER || !u.role),
    [allUsers]
  );
  const caregivers = useMemo(
    () => allUsers.filter(u => u.role === ROLES.CAREGIVER || u.role === ROLES.ADMIN),
    [allUsers]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await get(ref(db, DB_PATHS.USERS));
      const data = snap.val() || {};
      setAllUsers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    } catch {
      setSnackbarMessage('Error loading users');
      setOpenSnackbar(true);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const snap = await get(
        query(ref(db, DB_PATHS.USER_LOGS), orderByChild('timestamp'), limitToLast(200))
      );
      const arr = Object.entries(snap.val() || {})
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(arr);
    } catch {
      setSnackbarMessage('Error loading logs');
      setOpenSnackbar(true);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await Promise.all([fetchUsers(), fetchLogs()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchUsers, fetchLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Build a UID->display name map for readable log display
  const userNameMap = useMemo(() => {
    const map = {};
    allUsers.forEach(u => { map[u.id] = getUserDisplayName(u); });
    return map;
  }, [allUsers]);

  const filteredLogs = useMemo(
    () =>
      logs.filter(l => {
        if (!l.timestamp) return false;
        const d = new Date(l.timestamp);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        if (
          actionFilter &&
          !l.action?.toLowerCase().includes(actionFilter.toLowerCase())
        )
          return false;
        const logUid = getLogUserId(l);
        if (userFilter !== 'all' && logUid !== userFilter) return false;
        return true;
      }),
    [logs, startDate, endDate, actionFilter, userFilter]
  );

  const lineData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      const d = new Date(l.timestamp);
      let key;
      if (timeFrame === 'day') key = `${d.getHours()}:00`;
      else if (timeFrame === 'week')
        key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      else if (timeFrame === 'month') key = `${d.getDate()}/${d.getMonth() + 1}`;
      else key = d.toLocaleDateString('en-US', { month: 'short' });
      counts[key] = (counts[key] || 0) + 1;
    });
    const labels = Object.keys(counts).sort();
    return {
      labels,
      datasets: [{
        label: 'Activities',
        data: labels.map(l => counts[l]),
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        fill: true,
        tension: 0.1
      }]
    };
  }, [filteredLogs, timeFrame]);

  const pieData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      const t = l.action || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [{
        data: labels.map(l => counts[l]),
        backgroundColor: ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc', '#ef5350', '#26c6da', '#8d6e63', '#78909c'],
        borderWidth: 1
      }]
    };
  }, [filteredLogs]);

  const barData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      const uid = getLogUserId(l);
      if (uid) counts[uid] = (counts[uid] || 0) + 1;
    });
    const uids = Object.keys(counts);
    return {
      labels: uids.map(uid => userNameMap[uid] || uid.slice(0, 8)),
      datasets: [{
        label: 'User Activity',
        data: uids.map(u => counts[u]),
        backgroundColor: '#42a5f5'
      }]
    };
  }, [filteredLogs, userNameMap]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(
      l => new Date(l.timestamp).toDateString() === today
    );
    const usersSet = new Set(todayLogs.map(l => getLogUserId(l)).filter(Boolean));
    return { todayCount: todayLogs.length, activeUsersCount: usersSet.size };
  }, [logs]);

  const displayList = viewType === 'users' ? users : caregivers;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <ButtonGroup variant="outlined">
          <Button component={Link} to="/user-management">User Management</Button>
          <Button component={Link} to="/logs">Logs</Button>
          <Button component={Link} to="/finetune-metrics">AI Metrics</Button>
          <Button component={Link} to="/feedback">Feedback</Button>
          <Button
            onClick={refreshAll}
            startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            Refresh
          </Button>
        </ButtonGroup>
      </Box>

      {/* Summary stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item md={3} xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Users</Typography>
              <Typography variant="h4">{users.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={3} xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Caregivers</Typography>
              <Typography variant="h4">{caregivers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={3} xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Today's Activities</Typography>
              <Typography variant="h4">{stats.todayCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={3} xs={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Active Users Today</Typography>
              <Typography variant="h4">{stats.activeUsersCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* View toggle: users vs caregivers */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <FormControl sx={{ width: 200 }}>
          <InputLabel>View</InputLabel>
          <Select value={viewType} label="View" onChange={e => setViewType(e.target.value)}>
            <MenuItem value="users">AAC Users</MenuItem>
            <MenuItem value="caregivers">Caregivers / Admins</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                {viewType === 'users' && <TableCell>Assigned Caregiver</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayList.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{getUserDisplayName(u)}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip label={u.role || 'user'} size="small" color={
                      u.role === ROLES.ADMIN ? 'error' :
                      u.role === ROLES.CAREGIVER ? 'primary' : 'default'
                    } />
                  </TableCell>
                  {viewType === 'users' && (
                    <TableCell>
                      {u.caregiverId
                        ? userNameMap[u.caregiverId] || u.caregiverId.slice(0, 8)
                        : 'Unassigned'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Log Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item md={2} xs={6}>
            <TextField
              label="Start Date" type="date" fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate} onChange={e => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item md={2} xs={6}>
            <TextField
              label="End Date" type="date" fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate} onChange={e => setEndDate(e.target.value)}
            />
          </Grid>
          <Grid item md={3} xs={6}>
            <TextField
              label="Action" fullWidth
              value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            />
          </Grid>
          <Grid item md={3} xs={6}>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select value={userFilter} label="User" onChange={e => setUserFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {allUsers.map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    {getUserDisplayName(u)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item md={2} xs={6}>
            <FormControl fullWidth>
              <InputLabel>Time Frame</InputLabel>
              <Select value={timeFrame} label="Time Frame" onChange={e => setTimeFrame(e.target.value)}>
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="year">Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item md={6} xs={12}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">Activity Trends</Typography>
            <Line data={lineData} options={chartBaseOptions} />
          </Paper>
        </Grid>
        <Grid item md={3} xs={12}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">Action Distribution</Typography>
            <Pie data={pieData} options={{ ...chartBaseOptions, plugins: { legend: { position: 'right' } } }} />
          </Paper>
        </Grid>
        <Grid item md={3} xs={12}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">User Activity</Typography>
            <Bar data={barData} options={{ ...chartBaseOptions, plugins: { legend: { display: false } } }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Logs */}
      <Typography variant="h5" gutterBottom>Recent Logs</Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Caregiver</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>When</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.slice(0, 50).map(l => {
                const logUid = getLogUserId(l);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{logUid ? (userNameMap[logUid] || logUid.slice(0, 8)) : 'N/A'}</TableCell>
                    <TableCell>{l.carerId ? (userNameMap[l.carerId] || l.carerId.slice(0, 8)) : '-'}</TableCell>
                    <TableCell><Chip label={l.action} size="small" /></TableCell>
                    <TableCell>{l.level || '-'}</TableCell>
                    <TableCell>{l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)} message={snackbarMessage} />
    </Container>
  );
}
