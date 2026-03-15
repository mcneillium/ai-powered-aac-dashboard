// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  ButtonGroup,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Snackbar,
  CircularProgress,
  Grid,
  Chip
} from '@mui/material';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
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
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
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

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await get(ref(db, 'users'));
      const data = snap.val() || {};
      setUsers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    } catch {
      setSnackbarMessage('Error loading users');
      setOpenSnackbar(true);
    }
  }, []);

  const fetchCaregivers = useCallback(async () => {
    try {
      const snap = await get(ref(db, 'caregivers'));
      const data = snap.val() || {};
      setCaregivers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    } catch {
      setSnackbarMessage('Error loading caregivers');
      setOpenSnackbar(true);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const snap = await get(
        query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(100))
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
    await Promise.all([fetchUsers(), fetchCaregivers(), fetchLogs()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchUsers, fetchCaregivers, fetchLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
        if (userFilter !== 'all' && l.userId !== userFilter) return false;
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
      datasets: [
        {
          label: 'Activities',
          data: labels.map(l => counts[l]),
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          fill: true,
          tension: 0.1
        }
      ]
    };
  }, [filteredLogs, timeFrame]);

  const pieData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      const t = l.action?.split(' ')[0] || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [
        {
          data: labels.map(l => counts[l]),
          backgroundColor: ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc'],
          borderWidth: 1
        }
      ]
    };
  }, [filteredLogs]);

  const barData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      counts[l.userId] = (counts[l.userId] || 0) + 1;
    });
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [
        {
          label: 'User Activity',
          data: labels.map(u => counts[u]),
          backgroundColor: '#42a5f5'
        }
      ]
    };
  }, [filteredLogs]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(
      l => new Date(l.timestamp).toDateString() === today
    );
    const usersSet = new Set(todayLogs.map(l => l.userId));
    return { todayCount: todayLogs.length, activeUsersCount: usersSet.size };
  }, [logs]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Top nav buttons now use Link */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <ButtonGroup variant="outlined">
          <Button component={Link} to="/user-management">
            User Management
          </Button>
          <Button component={Link} to="/caregivers">
            Caregiver Management
          </Button>
          <Button component={Link} to="/logs">Logs</Button>
          <Button
            onClick={refreshAll}
            startIcon={
              refreshing ? <CircularProgress size={20} /> : <RefreshIcon />
            }
          >
            Refresh
          </Button>
        </ButtonGroup>
      </Box>

      {/* Dropdown to collapse users/caregivers */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <FormControl sx={{ width: 200 }}>
          <InputLabel>View</InputLabel>
          <Select
            value={viewType}
            label="View"
            onChange={e => setViewType(e.target.value)}
          >
            <MenuItem value="users">Users</MenuItem>
            <MenuItem value="caregivers">Caregivers</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : viewType === 'users' ? (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {caregivers.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
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
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item md={3} xs={12}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item md={3} xs={12}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </Grid>
          <Grid item md={3} xs={12}>
            <TextField
              label="Action"
              fullWidth
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            />
          </Grid>
          <Grid item md={3} xs={12}>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select
                value={userFilter}
                label="User"
                onChange={e => setUserFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item md={4} xs={12}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">
                Today's Activities
              </Typography>
              <Typography variant="h4">{stats.todayCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={4} xs={12}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Active Users</Typography>
              <Typography variant="h4">
                {stats.activeUsersCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
            <Pie
              data={pieData}
              options={{
                ...chartBaseOptions,
                plugins: { legend: { position: 'right' } }
              }}
            />
          </Paper>
        </Grid>
        <Grid item md={3} xs={12}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">User Activity</Typography>
            <Bar
              data={barData}
              options={{
                ...chartBaseOptions,
                plugins: { legend: { display: false } }
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Logs Table */}
      <Typography variant="h5" gutterBottom>
        Recent Logs
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>When</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.userId}</TableCell>
                  <TableCell>
                    <Chip label={l.action} size="small" />
                  </TableCell>
                  <TableCell>
                    {l.timestamp
                      ? new Date(l.timestamp).toLocaleString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage}
      />
    </Container>
  );
}
