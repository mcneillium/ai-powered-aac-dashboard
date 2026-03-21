// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
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
  Alert,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  TablePagination,
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
  Filler,
} from 'chart.js';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ClearIcon from '@mui/icons-material/Clear';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, ChartTooltip, Legend, Filler,
);

const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

const CHART_COLORS = {
  primary: { bg: 'rgba(46, 125, 50, 0.15)', border: '#2E7D32' },
  blue: { bg: 'rgba(21, 101, 192, 0.15)', border: '#1565C0' },
  orange: { bg: 'rgba(237, 108, 2, 0.15)', border: '#ED6C02' },
  purple: { bg: 'rgba(156, 39, 176, 0.15)', border: '#9C27B0' },
};

const PIE_COLORS = ['#2E7D32', '#1565C0', '#ED6C02', '#9C27B0', '#D32F2F', '#00838F', '#6D4C41'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFrame, setTimeFrame] = useState('week');

  // Pagination for logs table
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchUsers = useCallback(async () => {
    const snap = await get(ref(db, 'users'));
    const data = snap.val() || {};
    return Object.entries(data).map(([id, v]) => ({ id, ...v }));
  }, []);

  const fetchCaregivers = useCallback(async () => {
    const snap = await get(ref(db, 'caregivers'));
    const data = snap.val() || {};
    return Object.entries(data).map(([id, v]) => ({ id, ...v }));
  }, []);

  const fetchLogs = useCallback(async () => {
    const snap = await get(
      query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(500))
    );
    return Object.entries(snap.val() || {})
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [u, c, l] = await Promise.all([fetchUsers(), fetchCaregivers(), fetchLogs()]);
      setUsers(u);
      setCaregivers(c);
      setLogs(l);
    } catch (err) {
      setSnackbar({ open: true, message: 'Error loading data: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchUsers, fetchCaregivers, fetchLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Build a user lookup map for display names
  const userMap = useMemo(() => {
    const map = {};
    users.forEach((u) => { map[u.id] = u.name || u.email || u.id; });
    return map;
  }, [users]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((l) => {
        if (!l.timestamp) return false;
        const d = new Date(l.timestamp);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (d > endOfDay) return false;
        }
        if (actionFilter && !l.action?.toLowerCase().includes(actionFilter.toLowerCase())) return false;
        if (userFilter !== 'all') {
          const matchesUser = l.userId === userFilter || l.targetUserId === userFilter || l.carerId === userFilter;
          if (!matchesUser) return false;
        }
        return true;
      }),
    [logs, startDate, endDate, actionFilter, userFilter],
  );

  const lineData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach((l) => {
      const d = new Date(l.timestamp);
      let key;
      if (timeFrame === 'day') key = `${String(d.getHours()).padStart(2, '0')}:00`;
      else if (timeFrame === 'week') key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      else if (timeFrame === 'month') key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      else key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      counts[key] = (counts[key] || 0) + 1;
    });
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [{
        label: 'Activities',
        data: labels.map((l) => counts[l]),
        backgroundColor: CHART_COLORS.primary.bg,
        borderColor: CHART_COLORS.primary.border,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    };
  }, [filteredLogs, timeFrame]);

  const pieData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach((l) => {
      const action = l.action || 'Unknown';
      counts[action] = (counts[action] || 0) + 1;
    });
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 7);
    return {
      labels,
      datasets: [{
        data: labels.map((l) => counts[l]),
        backgroundColor: PIE_COLORS,
        borderWidth: 2,
        borderColor: '#fff',
      }],
    };
  }, [filteredLogs]);

  const barData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach((l) => {
      const uid = l.targetUserId || l.userId;
      if (uid) counts[uid] = (counts[uid] || 0) + 1;
    });
    // Top 10 most active users
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(([uid]) => userMap[uid] || uid.substring(0, 8));
    return {
      labels,
      datasets: [{
        label: 'Activity Count',
        data: sorted.map(([, count]) => count),
        backgroundColor: CHART_COLORS.blue.border,
        borderRadius: 6,
      }],
    };
  }, [filteredLogs, userMap]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayLogs = logs.filter((l) => new Date(l.timestamp).toDateString() === today);
    const weekLogs = logs.filter((l) => new Date(l.timestamp) >= weekAgo);
    const activeUsersToday = new Set(todayLogs.map((l) => l.targetUserId || l.userId));
    const activeUsersWeek = new Set(weekLogs.map((l) => l.targetUserId || l.userId));

    // Unassigned users
    const unassignedCount = users.filter((u) => !u.caregiverId).length;

    return {
      todayCount: todayLogs.length,
      weekCount: weekLogs.length,
      activeUsersToday: activeUsersToday.size,
      activeUsersWeek: activeUsersWeek.size,
      totalUsers: users.length,
      totalCaregivers: caregivers.length,
      unassignedUsers: unassignedCount,
    };
  }, [logs, users, caregivers]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActionFilter('');
    setUserFilter('all');
    setPage(0);
  };

  const hasActiveFilters = startDate || endDate || actionFilter || userFilter !== 'all';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of system activity and users
          </Typography>
        </Box>
        <Tooltip title="Refresh data">
          <IconButton onClick={refreshAll} disabled={refreshing} color="primary" size="large">
            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/user-management')}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4">{stats.totalUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Total Users</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/caregivers')}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4">{stats.totalCaregivers}</Typography>
                <Typography variant="body2" color="text.secondary">Caregivers</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4">{stats.todayCount}</Typography>
                <Typography variant="body2" color="text.secondary">Today's Activities</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EventNoteIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.8 }} />
              <Box>
                <Typography variant="h4">{stats.activeUsersWeek}</Typography>
                <Typography variant="body2" color="text.secondary">Active This Week</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Unassigned users alert */}
      {stats.unassignedUsers > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={() => navigate('/user-management')}>
            Manage
          </Button>
        }>
          {stats.unassignedUsers} user{stats.unassignedUsers !== 1 ? 's' : ''} not assigned to a caregiver.
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon color="action" />
            <Typography variant="subtitle1" fontWeight={600}>Filters</Typography>
            {hasActiveFilters && (
              <Chip label="Active" size="small" color="primary" variant="outlined" />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['day', 'week', 'month', 'year'].map((tf) => (
              <Chip
                key={tf}
                label={tf.charAt(0).toUpperCase() + tf.slice(1)}
                variant={timeFrame === tf ? 'filled' : 'outlined'}
                color={timeFrame === tf ? 'primary' : 'default'}
                onClick={() => setTimeFrame(tf)}
                size="small"
              />
            ))}
          </Box>
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Filter by Action"
              fullWidth
              size="small"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>User</InputLabel>
              <Select
                value={userFilter}
                label="User"
                onChange={(e) => { setUserFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All Users</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.name || u.email || u.id}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            {hasActiveFilters && (
              <Tooltip title="Clear filters">
                <IconButton onClick={clearFilters} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, height: 340 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Activity Trends
            </Typography>
            <Box sx={{ height: 280 }}>
              <Line data={lineData} options={chartBaseOptions} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, height: 340 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Action Distribution
            </Typography>
            <Box sx={{ height: 280, display: 'flex', justifyContent: 'center' }}>
              <Pie
                data={pieData}
                options={{
                  ...chartBaseOptions,
                  scales: undefined,
                  plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, height: 300 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Top 10 Most Active Users
            </Typography>
            <Box sx={{ height: 240 }}>
              <Bar
                data={barData}
                options={{
                  ...chartBaseOptions,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } },
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Logs Table */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Recent Activity ({filteredLogs.length} entries)
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Performed By</TableCell>
                <TableCell>When</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {userMap[l.targetUserId || l.userId] || l.targetUserId || l.userId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={l.action} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {userMap[l.carerId] || l.carerId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No activity found for the selected filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredLogs.length > 0 && (
          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
