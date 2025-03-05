// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Link } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  // Data states
  const [caregivers, setCaregivers] = useState([]);
  const [logs, setLogs] = useState([]);

  // Filtering state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Loading state for manual refresh
  const [loading, setLoading] = useState(false);

  // Function to fetch caregivers from Firebase
  const fetchCaregivers = useCallback(() => {
    const caregiversRef = ref(db, 'caregivers');
    onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });
  }, []);

  // Function to fetch logs from Firebase
  const fetchLogs = useCallback(() => {
    const logsRef = ref(db, 'userLogs');
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setLogs(list);

      // Set notifications for logs in the last 10 minutes
      const now = Date.now();
      const recentLogs = list.filter(
        (log) => now - log.timestamp < 10 * 60 * 1000
      );
      if (recentLogs.length > 0) {
        setNotifications(recentLogs);
        setOpenSnackbar(true);
      }
    });
  }, []);

  // Combined data fetching
  const fetchData = useCallback(() => {
    setLoading(true);
    fetchCaregivers();
    fetchLogs();
    setLoading(false);
  }, [fetchCaregivers, fetchLogs]);

  useEffect(() => {
    fetchData();
    // Optionally, you can set an interval for automatic refresh:
    // const interval = setInterval(fetchData, 5 * 60 * 1000); // every 5 minutes
    // return () => clearInterval(interval);
  }, [fetchData]);

  // Filtering logic for logs
  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.timestamp);
    let valid = true;
    if (startDate) {
      valid = valid && logDate >= new Date(startDate);
    }
    if (endDate) {
      valid = valid && logDate <= new Date(endDate);
    }
    if (actionFilter) {
      valid =
        valid &&
        log.action.toLowerCase().includes(actionFilter.toLowerCase());
    }
    return valid;
  });

  // Data for Line Chart (Activity Trends)
  const logsByDay = filteredLogs.reduce((acc, log) => {
    const day = new Date(log.timestamp).toLocaleDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  const sortedDays = Object.keys(logsByDay).sort(
    (a, b) => new Date(a) - new Date(b)
  );
  const lineChartData = {
    labels: sortedDays,
    datasets: [
      {
        label: 'User Logs per Day',
        data: sortedDays.map((day) => logsByDay[day]),
        backgroundColor: 'rgba(75,192,192,0.6)',
        borderColor: 'rgba(75,192,192,1)',
        fill: true
      }
    ]
  };

  // Data for Pie Chart (Action Distribution)
  const actionCounts = filteredLogs.reduce((acc, log) => {
    const key = log.action || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const pieChartData = {
    labels: Object.keys(actionCounts),
    datasets: [
      {
        label: 'Action Distribution',
        data: Object.values(actionCounts),
        backgroundColor: Object.keys(actionCounts).map(
          () => 'rgba(153,102,255,0.6)'
        ),
        borderColor: Object.keys(actionCounts).map(
          () => 'rgba(153,102,255,1)'
        ),
        borderWidth: 1
      }
    ]
  };

  // Recent Activity: sort logs descending and take top 5
  const recentActivities = [...logs]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ flexGrow: 1 }}>
          Admin Dashboard
        </Typography>
        <IconButton onClick={fetchData} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {notifications.map((note) => (
            <Alert key={note.id} severity="info" sx={{ mb: 1 }}>
              {note.action} - {new Date(note.timestamp).toLocaleTimeString()}
            </Alert>
          ))}
        </Box>
      )}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={`${notifications.length} new notifications`}
      />

      {/* Filtering Controls */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filter Logs
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Start Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            label="End Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <TextField
            label="Action Keyword"
            variant="outlined"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setActionFilter('');
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Summary Cards with Navigation */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Caregivers</Typography>
            <Typography variant="h4">{caregivers.length}</Typography>
            <Button variant="text" component={Link} to="/caregivers">
              View Caregivers
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total User Logs</Typography>
            <Typography variant="h4">{logs.length}</Typography>
            <Button variant="text" component={Link} to="/logs">
              View Logs
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Filtered Logs</Typography>
            <Typography variant="h4">{filteredLogs.length}</Typography>
            <Button variant="text" component={Link} to="/logs">
              View Detailed Logs
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Visualizations */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Activity Trends
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Line data={lineChartData} />
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Action Distribution
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Pie data={pieChartData} />
        </Paper>
      </Box>

      {/* Recent Activity Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Activities
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Log ID</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentActivities.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {recentActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No recent activity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}
