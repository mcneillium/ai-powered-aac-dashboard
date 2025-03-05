// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, Button, CircularProgress, Paper, Grid } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

export default function Home() {
  const { isAdmin, loading, user } = useAuth();
  const [myUsers, setMyUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // For caregivers: fetch users linked to them
  useEffect(() => {
    if (!user || isAdmin) return;
    const usersRef = ref(db, 'users/');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      const linkedUsers = usersArray.filter((u) => u.caregiverId === user.uid);
      setMyUsers(linkedUsers);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Fetch logs for the caregiver's linked users
  useEffect(() => {
    if (!user || isAdmin || myUsers.length === 0) return;
    const userIds = myUsers.map((u) => u.id);
    const logsRef = ref(db, 'userLogs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logsArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      const filteredLogs = logsArray.filter((log) => userIds.includes(log.userId));
      setLogs(filteredLogs);
    });
    return () => unsubscribe();
  }, [user, isAdmin, myUsers]);

  // Prepare data for the line chart: aggregate logs per day
  const logsByDay = logs.reduce((acc, log) => {
    const day = new Date(log.timestamp).toLocaleDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  const sortedDays = Object.keys(logsByDay).sort((a, b) => new Date(a) - new Date(b));
  const chartData = {
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

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // For Admin users, show the existing home dashboard
  if (isAdmin) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h3" align="center" gutterBottom>
          Admin Dashboard - Home
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
          <Button variant="contained" component={Link} to="/caregivers">
            Manage Caregivers
          </Button>
          <Button variant="contained" component={Link} to="/UserManagement">
            Manage Users
          </Button>
          <Button variant="outlined" component={Link} to="/logs">
            View User Logs
          </Button>
        </Box>
      </Container>
    );
  }

  // For Caregivers: show visuals for their linked users
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" align="center" gutterBottom>
        Caregiver Dashboard - Home
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Total Linked Users</Typography>
            <Typography variant="h4">{myUsers.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Total User Logs</Typography>
            <Typography variant="h4">{logs.length}</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          User Activity Trends
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Line data={chartData} />
        </Paper>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button variant="outlined" component={Link} to="/logs">
          View Detailed Logs
        </Button>
        <Button variant="contained" component={Link} to="/user-actions/someUserId">
          Manage User Actions
        </Button>
      </Box>
    </Container>
  );
}
