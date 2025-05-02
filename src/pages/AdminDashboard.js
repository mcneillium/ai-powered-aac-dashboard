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
  CardHeader,
  Divider,
  Badge,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
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
  const { currentUser, isAdmin, userProfile } = useAuth();
  
  // Data states
  const [caregivers, setCaregivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [myUsers, setMyUsers] = useState([]);
  
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
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Function to fetch caregivers from Firebase
  const fetchCaregivers = useCallback(() => {
    const caregiversRef = ref(db, 'caregivers');
    
    return onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const caregiversList = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(caregiversList);
    });
  }, []);
  
  // Function to fetch users from Firebase
  const fetchUsers = useCallback(() => {
    const usersRef = ref(db, 'users');
    
    return onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersList = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setUsers(usersList);
      
      // If not admin, filter for users linked to current caregiver
      if (!isAdmin && currentUser) {
        const myUsersList = usersList.filter(user => user.caregiverId === currentUser.uid);
        setMyUsers(myUsersList);
      }
    });
  }, [isAdmin, currentUser]);
  
  // Function to fetch logs from Firebase
  const fetchLogs = useCallback(() => {
    // Use query to limit the number of logs fetched initially
    const logsRef = query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(100));
    
    return onValue(logsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      
      // Sort by timestamp descending
      list.sort((a, b) => b.timestamp - a.timestamp);
      
      // If not admin, filter logs to only show those for my users
      if (!isAdmin && myUsers.length > 0) {
        const filteredLogs = list.filter(log => {
          const userId = log.targetUserId || log.userId;
          return myUsers.some(user => user.id === userId);
        });
        setLogs(filteredLogs);
      } else {
        setLogs(list);
      }
      
      // Check for recent logs (last 10 minutes) for notifications
      const now = Date.now();
      const recentLogs = list.filter(log => now - log.timestamp < 10 * 60 * 1000);
      
      if (recentLogs.length > 0) {
        setNotifications(recentLogs);
        
        // Show snackbar for the most recent log
        if (recentLogs[0]) {
          const recentLog = recentLogs[0];
          const userName = getUserName(recentLog.targetUserId || recentLog.userId) || 'A user';
          setSnackbarMessage(`${userName} ${recentLog.action}`);
          setOpenSnackbar(true);
        }
      }
    });
  }, [isAdmin, myUsers]);
  
  // Helper to get user name from userId
  const getUserName = useCallback((userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : userId;
  }, [users]);
  
  // Function to fetch all data
  const fetchData = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    
    const unsubscribeCaregivers = fetchCaregivers();
    const unsubscribeUsers = fetchUsers();
    const unsubscribeLogs = fetchLogs();
    
    // Set timeout to ensure loading state shows for at least a short time
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1000);
    
    return () => {
      unsubscribeCaregivers();
      unsubscribeUsers();
      unsubscribeLogs();
    };
  }, [fetchCaregivers, fetchUsers, fetchLogs]);
  
  useEffect(() => {
    const unsubscribe = fetchData();
    return unsubscribe;
  }, [fetchData]);
  
  // Apply filters to logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      let passesDateFilter = true;
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        passesDateFilter = passesDateFilter && logDate >= start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        passesDateFilter = passesDateFilter && logDate <= end;
      }
      
      const passesActionFilter = !actionFilter || 
        (log.action && log.action.toLowerCase().includes(actionFilter.toLowerCase()));
      
      const passesUserFilter = userFilter === 'all' || 
        log.targetUserId === userFilter || 
        log.userId === userFilter;
      
      return passesDateFilter && passesActionFilter && passesUserFilter;
    });
  }, [logs, startDate, endDate, actionFilter, userFilter]);
  
  // Prepare data for Line Chart (Activity Trends)
  const lineChartData = useMemo(() => {
    // Group logs by day/week/month based on selected timeframe
    const groupedData = {};
    const format = new Intl.DateTimeFormat('en-US', { 
      day: 'numeric',
      month: 'short',
      year: timeFrame === 'year' ? 'numeric' : undefined
    });
    
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp);
      let key;
      
      if (timeFrame === 'day') {
        // Group by hour
        key = `${date.getHours()}:00`;
      } else if (timeFrame === 'week') {
        // Group by day
        key = format.format(date);
      } else if (timeFrame === 'month') {
        // Group by date
        key = `${date.getDate()}/${date.getMonth() + 1}`;
      } else {
        // Group by month for year view
        key = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
      }
      
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      groupedData[key]++;
    });
    
    // Sort keys based on timeframe
    let sortedKeys;
    if (timeFrame === 'day') {
      // Sort hours
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
      });
    } else if (timeFrame === 'month') {
      // Sort dates
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        const [dayA] = a.split('/').map(Number);
        const [dayB] = b.split('/').map(Number);
        return dayA - dayB;
      });
    } else if (timeFrame === 'year') {
      // Sort months
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return monthOrder.indexOf(a) - monthOrder.indexOf(b);
      });
    } else {
      // Default sort (week view)
      sortedKeys = Object.keys(groupedData);
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
  
  // Prepare data for Activity Type Pie Chart
  const pieChartData = useMemo(() => {
    const actionCounts = {};
    
    filteredLogs.forEach(log => {
      const action = log.action || 'Unknown';
      // Extract the main action type (first word or before first space)
      const actionType = action.split(' ')[0];
      
      if (!actionCounts[actionType]) {
        actionCounts[actionType] = 0;
      }
      actionCounts[actionType]++;
    });
    
    const labels = Object.keys(actionCounts);
    
    // Create color array based on action type
    const backgroundColors = labels.map((label, index) => {
      const colors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)'
      ];
      return colors[index % colors.length];
    });
    
    return {
      labels,
      datasets: [
        {
          data: labels.map(label => actionCounts[label]),
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1
        }
      ]
    };
  }, [filteredLogs]);
  
  // Prepare data for User Activity Bar Chart
  const barChartData = useMemo(() => {
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
    
    // Sort users by activity count
    const sortedUsers = Object.keys(userActivity).sort((a, b) => userActivity[b] - userActivity[a]);
    
    // Limit to top 10 users for readability
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
  
  // Recent Activity Logs
  const recentActivities = useMemo(() => {
    return filteredLogs.slice(0, 10);
  }, [filteredLogs]);
  
  // Calculate summary statistics
  const stats = useMemo(() => {
    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === today.toDateString();
    });
    
    const yesterdayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === yesterday.toDateString();
    });
    
    // Get unique users who had activity today
    const activeUsers = new Set();
    todayLogs.forEach(log => {
      const userId = log.targetUserId || log.userId;
      if (userId) activeUsers.add(userId);
    });
    
    // Get most common action
    const actionCounts = {};
    todayLogs.forEach(log => {
      const action = log.action || 'Unknown';
      if (!actionCounts[action]) {
        actionCounts[action] = 0;
      }
      actionCounts[action]++;
    });
    
    let mostCommonAction = 'None';
    let maxCount = 0;
    
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > maxCount) {
        mostCommonAction = action;
        maxCount = count;
      }
    });
    
    // Most active hour
    const hourCounts = {};
    todayLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (!hourCounts[hour]) {
        hourCounts[hour] = 0;
      }
      hourCounts[hour]++;
    });
    
    let mostActiveHour = -1;
    maxCount = 0;
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        mostActiveHour = parseInt(hour);
        maxCount = count;
      }
    });
    
    return {
      todayCount: todayLogs.length,
      yesterdayCount: yesterdayLogs.length,
      percentChange: yesterdayLogs.length ? Math.round((todayLogs.length - yesterdayLogs.length) / yesterdayLogs.length * 100) : 100,
      activeUsersCount: activeUsers.size,
      totalUsersCount: users.length,
      mostCommonAction,
      mostActiveHour
    };
  }, [logs, today, yesterday, users]);
  
  // Function to format timestamps
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Function to export logs as CSV
  const exportLogsCSV = () => {
    if (filteredLogs.length === 0) {
      setSnackbarMessage('No logs to export');
      setOpenSnackbar(true);
      return;
    }
    
    // Create CSV content
    let csvContent = 'ID,User ID,Action,Timestamp\n';
    
    filteredLogs.forEach(log => {
      const userId = log.targetUserId || log.userId || 'Unknown';
      const row = [
        log.id,
        userId,
        `"${log.action || 'Unknown'}"`,
        formatTimestamp(log.timestamp)
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
  };
  
  // Clear all filters
  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setActionFilter('');
    setUserFilter('all');
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
              <RefreshIcon />
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
          Today is {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
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
                {getUserName(note.targetUserId || note.userId) || 'A user'} 
                {' '}{note.action} 
                {' '}<span style={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  ({new Date(note.timestamp).toLocaleTimeString()})
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
        onClose={() => setOpenSnackbar(false)}
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
              <Typography variant="h6" noWrap sx={{ maxWidth: '100%' }}>
                {stats.mostCommonAction}
              </Typography>
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
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="Action Keyword"
              variant="outlined"
              fullWidth
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
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
                          {getUserName(log.targetUserId || log.userId) || 'Unknown User'}
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