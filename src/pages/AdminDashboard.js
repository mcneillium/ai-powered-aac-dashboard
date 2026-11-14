// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, get, query, orderByChild, limitToLast, onValue, off } from 'firebase/database';
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminDashboard() {
  const [viewType, setViewType] = useState('users');
  const [allUsers, setAllUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alertSummary, setAlertSummary] = useState({ total: 0, unread: 0, byType: {} });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFrame, setTimeFrame] = useState('week');

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

  useEffect(() => {
    const alertsRef = ref(db, DB_PATHS.ALERTS);
    const unsub = onValue(alertsRef, (snap) => {
      const data = snap.val() || {};
      let total = 0, unread = 0;
      const byType = {};
      Object.values(data).forEach(cgAlerts => {
        if (typeof cgAlerts === 'object') {
          Object.values(cgAlerts).forEach(a => {
            total++;
            if (!a.read) unread++;
            const t = a.type || 'unknown';
            byType[t] = (byType[t] || 0) + 1;
          });
        }
      });
      setAlertSummary({ total, unread, byType });
    }, () => {});
    return () => { off(alertsRef); unsub(); };
  }, []);

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

  // User growth chart — users created per week
  const growthData = useMemo(() => {
    const weeks = {};
    allUsers.forEach(u => {
      if (!u.createdAt) return;
      const d = new Date(u.createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weeks[key] = (weeks[key] || 0) + 1;
    });
    const labels = Object.keys(weeks);
    let cumulative = 0;
    const cumulativeData = labels.map(l => { cumulative += weeks[l]; return cumulative; });
    return {
      labels,
      datasets: [
        {
          label: 'New users',
          data: labels.map(l => weeks[l]),
          backgroundColor: 'rgba(66, 165, 245, 0.5)',
          borderColor: '#42a5f5',
          type: 'bar',
          yAxisID: 'y',
        },
        {
          label: 'Total users',
          data: cumulativeData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.3,
          type: 'line',
          yAxisID: 'y1',
        },
      ]
    };
  }, [allUsers]);

  const growthOptions = {
    ...chartBaseOptions,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, position: 'left', ticks: { precision: 0 }, title: { display: true, text: 'New' } },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { precision: 0 }, title: { display: true, text: 'Total' } },
    },
  };

  // Activity heatmap data (hour x day-of-week)
  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    logs.forEach(l => {
      if (!l.timestamp) return;
      const d = new Date(l.timestamp);
      grid[d.getDay()][d.getHours()]++;
    });
    return grid;
  }, [logs]);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmapData.flat()), [heatmapData]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <ButtonGroup variant="outlined" size="small">
          <Button component={Link} to="/user-management">Users</Button>
          <Button component={Link} to="/logs">Logs</Button>
          <Button component={Link} to="/finetune-metrics">AI Metrics</Button>
          <Button component={Link} to="/alerts">Alerts</Button>
          <Button component={Link} to="/feedback-admin">Feedback</Button>
          <Button
            onClick={refreshAll}
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Refresh
          </Button>
        </ButtonGroup>
      </Box>

      {/* Summary stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item md={2} xs={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Users</Typography>
              <Typography variant="h4">{users.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={2} xs={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Caregivers</Typography>
              <Typography variant="h4">{caregivers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={2} xs={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Today's Activities</Typography>
              <Typography variant="h4">{stats.todayCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={2} xs={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Active Today</Typography>
              <Typography variant="h4">{stats.activeUsersCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={2} xs={6}>
          <Card sx={{ borderLeft: alertSummary.unread > 0 ? '4px solid' : undefined, borderColor: alertSummary.unread > 0 ? 'error.main' : undefined }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <NotificationsActiveIcon sx={{ fontSize: 16, color: alertSummary.unread > 0 ? 'error.main' : 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">Unread Alerts</Typography>
              </Box>
              <Typography variant="h4">{alertSummary.unread}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item md={2} xs={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Alerts</Typography>
              <Typography variant="h4">{alertSummary.total}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {Object.entries(alertSummary.byType).map(([type, count]) => (
                  <Chip key={type} label={`${type}: ${count}`} size="small" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* User growth chart */}
      <Paper sx={{ p: 2, mb: 3, height: 280 }} role="img" aria-label="User growth chart">
        <Typography variant="h6" gutterBottom>User Growth</Typography>
        {growthData.labels.length > 0 ? (
          <Bar data={growthData} options={growthOptions} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
            <Typography color="text.secondary">Not enough data to show growth trends</Typography>
          </Box>
        )}
      </Paper>

      {/* Activity heatmap */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Activity Heatmap (hour / day)</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '50px repeat(24, 1fr)', gap: '2px', minWidth: 600 }}>
            <Box />
            {Array.from({ length: 24 }, (_, h) => (
              <Typography key={h} variant="caption" align="center" color="text.secondary">{h}</Typography>
            ))}
            {DAY_NAMES.map((day, di) => (
              <React.Fragment key={day}>
                <Typography variant="caption" sx={{ lineHeight: '24px' }}>{day}</Typography>
                {Array.from({ length: 24 }, (_, h) => {
                  const val = heatmapData[di][h];
                  const intensity = val / heatmapMax;
                  return (
                    <Box
                      key={h}
                      title={`${day} ${h}:00 — ${val} events`}
                      sx={{
                        height: 24,
                        borderRadius: 0.5,
                        bgcolor: val === 0
                          ? 'action.hover'
                          : `rgba(76, 175, 80, ${0.15 + intensity * 0.85})`,
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      </Paper>

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
              <TableRow sx={{ bgcolor: 'action.hover' }}>
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
          <Paper sx={{ p: 2, height: 300 }} role="img" aria-label="Activity trends chart">
            <Typography variant="h6">Activity Trends</Typography>
            {filteredLogs.length > 0 ? (
              <Line data={lineData} options={chartBaseOptions} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Typography color="text.secondary">Not enough data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item md={3} xs={12}>
          <Paper sx={{ p: 2, height: 300 }} role="img" aria-label="Action distribution chart">
            <Typography variant="h6">Action Distribution</Typography>
            {filteredLogs.length > 0 ? (
              <Pie data={pieData} options={{ ...chartBaseOptions, plugins: { legend: { position: 'right' } } }} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Typography color="text.secondary">Not enough data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item md={3} xs={12}>
          <Paper sx={{ p: 2, height: 300 }} role="img" aria-label="User activity chart">
            <Typography variant="h6">User Activity</Typography>
            {filteredLogs.length > 0 ? (
              <Bar data={barData} options={{ ...chartBaseOptions, plugins: { legend: { display: false } } }} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Typography color="text.secondary">Not enough data</Typography>
              </Box>
            )}
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
              <TableRow sx={{ bgcolor: 'action.hover' }}>
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
