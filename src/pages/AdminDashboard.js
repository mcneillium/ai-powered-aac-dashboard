// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  ButtonGroup,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Badge,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import PersonIcon from '@mui/icons-material/Person';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

function AdminDashboard() {
  // Auth context
  const { user, isAdmin } = useAuth();
  
  // Data states
  const [caregivers, setCaregivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [myUsers, setMyUsers] = useState([]);
  const [userProfile, setUserProfile] = useState({ name: 'User' });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtering states
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFrame, setTimeFrame] = useState('week'); // 'day', 'week', 'month', 'year'
  
  // Date calculations
  const dates = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { today, yesterday };
  }, []);
  
  // Helper to get user name from userId
  const getUserName = useCallback((userId) => {
    if (!userId) return 'Unknown User';
    const user = users.find(u => u.id === userId);
    return user ? (user.name || user.email || userId) : userId;
  }, [users]);
  
  // Function to fetch caregivers from Firebase
  const fetchCaregivers = useCallback(() => {
    const caregiversRef = ref(db, 'caregivers');
    
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const caregiversList = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(caregiversList);
    });
    
    return unsubscribe;
  }, []);
  
  // Function to fetch users from Firebase
  const fetchUsers = useCallback(() => {
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersList = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setUsers(usersList);
      
      // If not admin, filter for users linked to current user
      if (!isAdmin && user) {
        const myUsersList = usersList.filter(u => u.caregiverId === user.uid);
        setMyUsers(myUsersList);
      }
    });
    
    return unsubscribe;
  }, [isAdmin, user]);
  
  // Function to fetch logs from Firebase
  const fetchLogs = useCallback(() => {
    // Use query to limit the number of logs fetched initially
    const logsRef = query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(100));
    
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      
      // Sort by timestamp descending
      list.sort((a, b) => b.timestamp - a.timestamp);
      
      setLogs(list);
      
      // Only check for recent logs if we're not currently loading or refreshing
      if (!loading && !refreshing) {
        // Check for recent logs (last 10 minutes)
        const now = Date.now();
        const recentLogs = list.filter(log => now - log.timestamp < 10 * 60 * 1000);
        
        if (recentLogs.length > 0) {
          setNotifications(recentLogs);
          
          // Show snackbar for the most recent log if not already shown
          if (recentLogs[0] && !openSnackbar) {
            const recentLog = recentLogs[0];
            const userName = getUserName(recentLog.targetUserId || recentLog.userId);
            setSnackbarMessage(`${userName} ${recentLog.action || 'performed an action'}`);
            setOpenSnackbar(true);
          }
        }
      }
    });
    
    return unsubscribe;
  }, [getUserName, loading, refreshing, openSnackbar]);
  
  // Effect to load user profile
  useEffect(() => {
    if (user) {
      // In a real app, this would fetch from the user's profile
      // For demo purposes, using a basic profile with the user's id
      setUserProfile({
        name: user.email ? user.email.split('@')[0] : 'User'
      });
    }
  }, [user]);
  
  // Function to fetch all data
  const fetchData = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    
    const unsubscribeCaregivers = fetchCaregivers();
    const unsubscribeUsers = fetchUsers();
    const unsubscribeLogs = fetchLogs();
    
    // Set timeout to ensure loading state shows for at least a short time
    const timer = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1000);
    
    return () => {
      unsubscribeCaregivers();
      unsubscribeUsers();
      unsubscribeLogs();
      clearTimeout(timer);
    };
  }, [fetchCaregivers, fetchUsers, fetchLogs]);
  
  // Initial data load
  useEffect(() => {
    const unsubscribe = fetchData();
    return unsubscribe;
  }, [fetchData]);
  
  // Filtered logs based on the selected filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Skip logs without timestamps
      if (!log.timestamp) return false;
      
      const logDate = new Date(log.timestamp);
      
      // If we're not admin, only show logs for users assigned to this caregiver
      if (!isAdmin && myUsers.length > 0) {
        const userId = log.targetUserId || log.userId;
        const isMyUser = myUsers.some(user => user.id === userId);
        if (!isMyUser) return false;
      }
      
      // Date range filter
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }
      
      // Action filter
      if (actionFilter && log.action) {
        if (!log.action.toLowerCase().includes(actionFilter.toLowerCase())) {
          return false;
        }
      }
      
      // User filter
      if (userFilter !== 'all') {
        const userId = log.targetUserId || log.userId;
        if (userId !== userFilter) return false;
      }
      
      return true;
    });
  }, [logs, startDate, endDate, actionFilter, userFilter, isAdmin, myUsers]);
  
  // Line Chart Data (Activity Trends)
  const lineChartData = useMemo(() => {
    if (filteredLogs.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'User Activities',
          data: [],
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      };
    }
    
    // Group logs by time period
    const groupedData = {};
    
    filteredLogs.forEach(log => {
      if (!log.timestamp) return;
      
      const date = new Date(log.timestamp);
      let key;
      
      if (timeFrame === 'day') {
        // Group by hour
        key = `${date.getHours()}:00`;
      } else if (timeFrame === 'week') {
        // Group by day using Intl formatter for consistency
        const formatter = new Intl.DateTimeFormat('en-US', { 
          day: 'numeric', 
          month: 'short'
        });
        key = formatter.format(date);
      } else if (timeFrame === 'month') {
        // Group by date
        key = date.getDate().toString();
      } else {
        // Group by month for year view
        const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
        key = formatter.format(date);
      }
      
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      groupedData[key]++;
    });
    
    // Sort keys based on timeframe
    let sortedKeys;
    
    if (timeFrame === 'day') {
      // Sort hours numerically
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10);
      });
    } else if (timeFrame === 'month') {
      // Sort dates numerically
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return parseInt(a, 10) - parseInt(b, 10);
      });
    } else if (timeFrame === 'year') {
      // Sort months in calendar order
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return monthOrder.indexOf(a) - monthOrder.indexOf(b);
      });
    } else {
      // Default sort for week (already properly formatted by Intl)
      const dateMap = {};
      Object.keys(groupedData).forEach(key => {
        // Extract day from "May 4" format
        const parts = key.split(' ');
        const month = parts[0];
        const day = parseInt(parts[1], 10);
        
        // Create a sortable date value
        const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
        dateMap[key] = new Date(new Date().getFullYear(), monthIdx, day);
      });
      
      sortedKeys = Object.keys(groupedData).sort((a, b) => dateMap[a] - dateMap[b]);
    }
    
    return {
      labels: sortedKeys,
      datasets: [
        {
          label: 'User Activities',
          data: sortedKeys.map(key => groupedData[key]),
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(75,192,192,1)',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.1,
          fill: true
        }
      ]
    };
  }, [filteredLogs, timeFrame]);
  
  // Pie Chart Data (Activity Types)
  const pieChartData = useMemo(() => {
    if (filteredLogs.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }]
      };
    }
    
    const actionCounts = {};
    
    filteredLogs.forEach(log => {
      if (!log.action) return;
      
      // Extract the main action type (first word)
      const actionType = log.action.split(' ')[0];
      
      if (!actionCounts[actionType]) {
        actionCounts[actionType] = 0;
      }
      actionCounts[actionType]++;
    });
    
    const labels = Object.keys(actionCounts);
    
    // Create color array
    const colors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)'
    ];
    
    const backgroundColors = labels.map((_, index) => colors[index % colors.length]);
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));
    
    return {
      labels,
      datasets: [
        {
          data: labels.map(label => actionCounts[label]),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }
      ]
    };
  }, [filteredLogs]);
  
  // Bar Chart Data (User Activity)
  const barChartData = useMemo(() => {
    if (filteredLogs.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Activities',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      };
    }
    
    // Group logs by user
    const userActivity = {};
    
    filteredLogs.forEach(log => {
      const userId = log.targetUserId || log.userId;
      if (!userId) return;
      
      const userName = getUserName(userId);
      
      if (!userActivity[userName]) {
        userActivity[userName] = 0;
      }
      userActivity[userName]++;
    });
    
    // Sort users by activity count (descending)
    const sortedUsers = Object.keys(userActivity).sort((a, b) => userActivity[b] - userActivity[a]);
    
    // Limit to top 10 users
    const topUsers = sortedUsers.slice(0, 10);
    
    return {
      labels: topUsers,
      datasets: [
        {
          label: 'Activities',
          data: topUsers.map(user => userActivity[user]),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }, [filteredLogs, getUserName]);
  
  // Recent Activities (limited to 10)
  const recentActivities = useMemo(() => filteredLogs.slice(0, 10), [filteredLogs]);
  
  // Summary statistics
  const stats = useMemo(() => {
    const { today, yesterday } = dates;
    
    // Today's logs
    const todayLogs = logs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === today.toDateString();
    });
    
    // Yesterday's logs
    const yesterdayLogs = logs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === yesterday.toDateString();
    });
    
    // Get unique active users today
    const activeUsers = new Set();
    todayLogs.forEach(log => {
      const userId = log.targetUserId || log.userId;
      if (userId) activeUsers.add(userId);
    });
    
    // Find most common action today
    const actionCounts = {};
    todayLogs.forEach(log => {
      if (!log.action) return;
      
      if (!actionCounts[log.action]) {
        actionCounts[log.action] = 0;
      }
      actionCounts[log.action]++;
    });
    
    let mostCommonAction = 'None';
    let maxCount = 0;
    
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > maxCount) {
        mostCommonAction = action;
        maxCount = count;
      }
    });
    
    // Find most active hour today
    const hourCounts = {};
    todayLogs.forEach(log => {
      if (!log.timestamp) return;
      
      const hour = new Date(log.timestamp).getHours();
      if (!hourCounts[hour]) {
        hourCounts[hour] = 0;
      }
      hourCounts[hour]++;
    });
    
    let mostActiveHour = -1;
    maxCount = 0;
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      const hourNum = parseInt(hour, 10);
      if (count > maxCount) {
        mostActiveHour = hourNum;
        maxCount = count;
      }
    });
    
    // Calculate percent change (avoid division by zero)
    let percentChange = 0;
    if (yesterdayLogs.length > 0) {
      percentChange = Math.round((todayLogs.length - yesterdayLogs.length) / yesterdayLogs.length * 100);
    } else if (todayLogs.length > 0) {
      percentChange = 100; // If yesterday had 0 logs but today has some, that's a 100% increase
    }
    
    return {
      todayCount: todayLogs.length,
      yesterdayCount: yesterdayLogs.length,
      percentChange,
      activeUsersCount: activeUsers.size,
      totalUsersCount: users.length,
      mostCommonAction,
      mostActiveHour
    };
  }, [logs, dates, users]);
  
  // Format timestamps for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Export logs as CSV
  const exportLogsCSV = () => {
    if (filteredLogs.length === 0) {
      setSnackbarMessage('No logs to export');
      setOpenSnackbar(true);
      return;
    }
    
    // Create CSV content with proper escaping for CSV format
    let csvContent = 'ID,User ID,Action,Timestamp\n';
    
    filteredLogs.forEach(log => {
      const userId = log.targetUserId || log.userId || 'Unknown';
      // Properly escape fields, especially strings that might contain commas or quotes
      const escapeCSV = (field) => {
        const stringField = String(field || '');
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };
      
      const row = [
        escapeCSV(log.id),
        escapeCSV(userId),
        escapeCSV(log.action || 'Unknown'),
        escapeCSV(formatTimestamp(log.timestamp))
      ].join(',');
      
      csvContent += row + '\n';
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `user_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbarMessage(`Exported ${filteredLogs.length} logs successfully`);
    setOpenSnackbar(true);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setActionFilter('');
    setUserFilter('all');
    setSnackbarMessage('Filters cleared');
    setOpenSnackbar(true);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ flexGrow: 1 }}>
          {isAdmin ? 'Admin Dashboard' : 'Caregiver Dashboard'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={fetchData} 
              disabled={refreshing}
              sx={{ mr: 2 }}
            >
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          
          <Badge badgeContent={notifications.length} color="error">
            <NotificationsIcon />
          </Badge>
        </Box>
      </Box>
      
      {/* Welcome Message */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: '#f8f9fa' }}>
        <Typography variant="h5" gutterBottom>
          Welcome back, {userProfile?.name || 'User'}!
        </Typography>
        <Typography variant="body1">
          Today is {dates.today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
          {stats.todayCount > 0 ? (
            ` There have been ${stats.todayCount} activities recorded today from ${stats.activeUsersCount} users.`
          ) : (
            ` No activities have been recorded today yet.`
          )}
        </Typography>
      </Paper>
      
      {/* Navigation Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={isAdmin ? 3 : 4}>
          <Button 
            variant="contained" 
            component={Link} 
            to="/caregivers" 
            fullWidth
            startIcon={<PeopleIcon />}
          >
            Manage Caregivers
          </Button>
        </Grid>
        
        <Grid item xs={12} md={isAdmin ? 3 : 4}>
          <Button 
            variant="contained" 
            component={Link} 
            to="/UserManagement" 
            fullWidth
            startIcon={<PersonIcon />}
          >
            Manage Users
          </Button>
        </Grid>
        
        <Grid item xs={12} md={isAdmin ? 3 : 4}>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/logs" 
            fullWidth
            startIcon={<AssessmentIcon />}
          >
            View Detailed Logs
          </Button>
        </Grid>
        
        {isAdmin && (
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              component={Link} 
              to="/finetune-metrics" 
              fullWidth
              startIcon={<TimelineIcon />}
            >
              Fine-Tune Metrics
            </Button>
          </Grid>
        )}
      </Grid>
      
      {/* Notifications */}
      {notifications.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Recent Activity Notifications
          </Typography>
          
          {notifications.slice(0, 3).map((note) => (
            <Alert key={note.id} severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {getUserName(note.targetUserId || note.userId)} 
                {' '}{note.action || 'performed an action'} 
                {' '}<span style={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  ({formatTimestamp(note.timestamp)})
                </span>
              </Typography>
            </Alert>
          ))}
          
          {notifications.length > 3 && (
            <Typography variant="body2" color="text.secondary" align="right">
              +{notifications.length - 3} more notifications
            </Typography>
          )}
        </Box>
      )}
      
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Today's Activities
              </Typography>
              <Typography variant="h4">
                {stats.todayCount}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography 
                  variant="body2" 
                  color={stats.percentChange >= 0 ? 'success.main' : 'error.main'}
                >
                  {stats.percentChange >= 0 ? '↑' : '↓'} {Math.abs(stats.percentChange)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  vs. yesterday
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Users Today
              </Typography>
              <Typography variant="h4">
                {stats.activeUsersCount}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  out of {stats.totalUsersCount} total users
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Most Common Action
              </Typography>
              <Tooltip title={stats.mostCommonAction}>
                <Typography variant="h6" noWrap sx={{ maxWidth: '100%' }}>
                  {stats.mostCommonAction}
                </Typography>
              </Tooltip>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <FormatQuoteIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  Most frequent today
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Peak Activity Hour
              </Typography>
              <Typography variant="h4">
                {stats.mostActiveHour >= 0 ? 
                  `${stats.mostActiveHour % 12 || 12}${stats.mostActiveHour >= 12 ? 'PM' : 'AM'}` : 
                  'N/A'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <AccessTimeIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  Busiest time today
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filtering Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filter Activity Data</Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button 
            variant="outlined" 
            size="small" 
            onClick={clearFilters}
            sx={{ mr: 1 }}
          >
            Clear Filters
          </Button>
          
          <Button 
            variant="outlined" 
            size="small" 
            onClick={exportLogsCSV}
            startIcon={<DownloadIcon />}
          >
            Export CSV
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="Action Keyword"
              variant="outlined"
              fullWidth
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. addWord, speakSentence"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by User</InputLabel>
              <Select
                value={userFilter}
                label="Filter by User"
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <MenuItem value="all">All Users</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name || user.email || user.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Time Frame Selector for Charts */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <ButtonGroup variant="outlined">
          <Button 
            onClick={() => setTimeFrame('day')}
            variant={timeFrame === 'day' ? 'contained' : 'outlined'}
          >
            Day
          </Button>
          <Button 
            onClick={() => setTimeFrame('week')}
            variant={timeFrame === 'week' ? 'contained' : 'outlined'}
          >
            Week
          </Button>
          <Button 
            onClick={() => setTimeFrame('month')}
            variant={timeFrame === 'month' ? 'contained' : 'outlined'}
          >
            Month
          </Button>
          <Button 
            onClick={() => setTimeFrame('year')}
            variant={timeFrame === 'year' ? 'contained' : 'outlined'}
          >
            Year
          </Button>
        </ButtonGroup>
      </Box>
      
      {/* Charts */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Activity Trends Chart */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Activity Trends
            </Typography>
            
            {filteredLogs.length > 0 ? (
              <Box sx={{ height: 300 }}>
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                      x: { grid: { display: false } },
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                      }
                    }
                  }}
                />
              </Box>
            ) : (
              <Typography variant="body1" align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No data available for the selected filters
              </Typography>
            )}
          </Paper>
          
          {/* Activity Type & User Activity Charts */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Activity Distribution
                </Typography>
                
                {filteredLogs.length > 0 ? (
                  <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                    <Pie
                      data={pieChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'right' }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body1" align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No data available
                  </Typography>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  User Activity Comparison
                </Typography>
                
                {filteredLogs.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={barChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          x: { 
                            grid: { display: false },
                            ticks: {
                              callback: function(value) {
                                // Truncate long user labels
                                const label = this.getLabelForValue(value);
                                if (label && label.length > 15) {
                                  return label.substr(0, 13) + '...';
                                }
                                return label;
                              }
                            }
                          },
                          y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                          }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body1" align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No data available
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
          
          {/* Recent Activities Table */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivities.length > 0 ? (
                    recentActivities.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          {getUserName(log.targetUserId || log.userId)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={log.action || 'Unknown Action'} 
                            size="small"
                            color={
                              log.action?.includes('speak') ? 'success' :
                              log.action?.includes('add') ? 'primary' :
                              log.action?.includes('clear') ? 'error' :
                              'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                        <TableCell>
                          {log.sentence && (
                            <Tooltip title={log.sentence}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  maxWidth: 200, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap' 
                                }}
                              >
                                "{log.sentence}"
                              </Typography>
                            </Tooltip>
                          )}
                          
                          {log.wordAdded && !log.sentence && (
                            <Typography variant="body2">
                              Added word: "{log.wordAdded}"
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No recent activities found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button 
                component={Link} 
                to="/logs"
                variant="text"
                endIcon={<AssessmentIcon />}
              >
                View All Logs
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Container>
  );
}

export default AdminDashboard;