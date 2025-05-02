// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
import FilterListIcon from '@mui/icons-material/FilterList';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

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

export default function AdminDashboard() {
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

  // Filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFrame, setTimeFrame] = useState('week');

  // Date helpers
  const dates = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { today, yesterday };
  }, []);

  const getUserName = useCallback(id => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Unknown User';
  }, [users]);

  // Firebase subscriptions
  const fetchCaregivers = useCallback(() => {
    const unsub = onValue(ref(db, 'caregivers'), snap => {
      const data = snap.val() || {};
      setCaregivers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return unsub;
  }, []);

  const fetchUsers = useCallback(() => {
    const unsub = onValue(ref(db, 'users'), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      setUsers(list);
      if (!isAdmin && currentUser) {
        setMyUsers(list.filter(u => u.caregiverId === currentUser.uid));
      }
    });
    return unsub;
  }, [isAdmin, currentUser]);

  const fetchLogs = useCallback(() => {
    const unsub = onValue(
      query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(100)),
      snap => {
        let array = Object.entries(snap.val() || {}).map(([id, v]) => ({ id, ...v }));
        array.sort((a, b) => b.timestamp - a.timestamp);
        if (!isAdmin && myUsers.length) {
          array = array.filter(log => myUsers.some(u => u.id === (log.targetUserId || log.userId)));
        }
        setLogs(array);

        const recent = array.filter(l => Date.now() - l.timestamp < 10 * 60 * 1000);
        if (recent.length) {
          setNotifications(recent);
          const top = recent[0];
          setSnackbarMessage(`${getUserName(top.targetUserId || top.userId)} ${top.action}`);
          setOpenSnackbar(true);
        }
      }
    );
    return unsub;
  }, [isAdmin, myUsers, getUserName]);

  const refreshAll = useCallback(() => {
    setRefreshing(true); setLoading(true);
    const unsubC = fetchCaregivers();
    const unsubU = fetchUsers();
    const unsubL = fetchLogs();
    setTimeout(() => { setLoading(false); setRefreshing(false); }, 1000);
    return () => { unsubC(); unsubU(); unsubL(); };
  }, [fetchCaregivers, fetchUsers, fetchLogs]);

  useEffect(() => {
    const cleanup = refreshAll();
    return cleanup;
  }, [refreshAll]);

  // Filter logs
  const filteredLogs = useMemo(() => logs.filter(log => {
    if (!log.timestamp) return false;
    const d = new Date(log.timestamp);
    if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); if (d < s) return false; }
    if (endDate)   { const e = new Date(endDate); e.setHours(23,59,59,999); if (d > e) return false; }
    if (actionFilter && !log.action?.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    if (userFilter !== 'all' && log.targetUserId !== userFilter && log.userId !== userFilter) return false;
    return true;
  }), [logs, startDate, endDate, actionFilter, userFilter]);

  // Chart & stats
  const lineChartData = useMemo(() => {
    const grouped = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp);
      let key;
      if (timeFrame === 'day') key = `${date.getHours()}:00`;
      else if (timeFrame === 'week') key = date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
      else if (timeFrame === 'month') key = `${date.getDate()}/${date.getMonth()+1}`;
      else key = date.toLocaleDateString('en-US', { month:'short' });
      grouped[key] = (grouped[key]||0) + 1;
    });
    const labels = Object.keys(grouped);
    return { labels, datasets: [{ label:'Activities', data: labels.map(l => grouped[l]), backgroundColor:'rgba(75,192,192,0.4)', borderColor:'rgba(75,192,192,1)', borderWidth:2, tension:0.1, fill:true }] };
  }, [filteredLogs, timeFrame]);

  const pieChartData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(log => { const t = log.action?.split(' ')[0]||'Unknown'; counts[t] = (counts[t]||0)+1; });
    const labels = Object.keys(counts);
    const bg = ['rgba(255,99,132,0.7)','rgba(54,162,235,0.7)','rgba(255,206,86,0.7)','rgba(75,192,192,0.7)'];
    return { labels, datasets: [{ data:labels.map(l=>counts[l]), backgroundColor: labels.map((_,i)=>bg[i%bg.length]), borderColor: labels.map((_,i)=>bg[i%bg.length].replace('0.7','1')), borderWidth:1 }] };
  }, [filteredLogs]);

  const barChartData = useMemo(() => {
    const ua = {};
    filteredLogs.forEach(log => {
      const id = log.targetUserId||log.userId;
      const name = getUserName(id);
      ua[name] = (ua[name]||0)+1;
    });
    const sorted = Object.keys(ua).sort((a,b)=>ua[b]-ua[a]).slice(0,10);
    return { labels:sorted, datasets:[{ label:'Activities', data: sorted.map(u=>ua[u]), backgroundColor:'rgba(54,162,235,0.7)', borderColor:'rgba(54,162,235,1)', borderWidth:1 }] };
  }, [filteredLogs, getUserName]);

  const recentActivities = useMemo(() => filteredLogs.slice(0,10), [filteredLogs]);

  const stats = useMemo(() => {
    const { today, yesterday } = dates;
    const t = logs.filter(l => new Date(l.timestamp).toDateString() === today.toDateString());
    const y = logs.filter(l => new Date(l.timestamp).toDateString() === yesterday.toDateString());
    const active = new Set(t.map(l=>l.targetUserId||l.userId));
    const actions = {};
    t.forEach(l => actions[l.action] = (actions[l.action]||0) + 1);
    const most = Object.entries(actions).reduce((m,[a,c])=>c>m[1]?[a,c]:m,['None',0])[0];
    const hours = {};
    t.forEach(l=>{ const h=new Date(l.timestamp).getHours(); hours[h]=(hours[h]||0)+1; });
    const peak = Object.entries(hours).reduce((m,[h,c])=>c>m[1]?[+h,c]:m,[-1,0])[0];
    const pc = y.length ? Math.round((t.length - y.length)/y.length*100) : 100;
    return { todayCount: t.length, yesterdayCount: y.length, percentChange: pc, activeUsersCount: active.size, totalUsersCount: users.length, mostCommonAction: most, mostActiveHour: peak };
  }, [logs, dates, users]);

  const formatTimestamp = ts => new Date(ts).toLocaleString('en-US',{ month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const clearFilters = () => { setStartDate(null); setEndDate(null); setActionFilter(''); setUserFilter('all'); };
  const chartOptions = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top' }, tooltip:{ mode:'index', intersect:false } }, scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, ticks:{ precision:0 } } } };

  return (
    <Container maxWidth="xl" sx={{ py:4 }}>
      {/* Header */}
      <Box sx={{ display:'flex', alignItems:'center', mb:3 }}>
        <Typography variant="h4" sx={{ flexGrow:1 }}>{isAdmin?'Admin Dashboard':'Caregiver Dashboard'}</Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={refreshAll} disabled={refreshing} sx={{ mr:2 }}>{refreshing?<CircularProgress size={24}/>:<RefreshIcon/>}</IconButton>
        </Tooltip>
        <Badge badgeContent={notifications.length} color="error"><NotificationsIcon/></Badge>
      </Box>

      {/* Filtering */}
      <Paper sx={{ p:3, mb:4 }}>
        <Box sx={{ display:'flex', alignItems:'center', mb:2 }}><FilterListIcon sx={{ mr:1 }}/><Typography variant="h6">Filter Data</Typography></Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><LocalizationProvider dateAdapter={AdapterDateFns}><DatePicker label="Start Date" value={startDate} onChange={setStartDate} renderInput={params=><TextField {...params} fullWidth/>}/></LocalizationProvider></Grid>
          <Grid item xs={12} md={3}><LocalizationProvider dateAdapter={AdapterDateFns}><DatePicker label="End Date" value={endDate} onChange={setEndDate} renderInput={params=><TextField {...params} fullWidth/>}/></LocalizationProvider></Grid>
          <Grid item xs={12} md={3}><TextField label="Action" fullWidth value={actionFilter} onChange={e=>setActionFilter(e.target.value)}/></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>User</InputLabel><Select value={userFilter} label="User" onChange={e=>setUserFilter(e.target.value)}><MenuItem value="all">All</MenuItem>{users.map(u=><MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}</Select></FormControl></Grid>
        </Grid>
      </Paper>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb:4 }}>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ height:'100%' }}><CardContent><Typography color="text.secondary" gutterBottom>Today's Activities</Typography><Typography variant="h4">{stats.todayCount}</Typography><Typography variant="body2" color={stats.percentChange>=0?'success.main':'error.main'}>{stats.percentChange>=0?'↑':'↓'}{stats.percentChange}%</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ height:'100%' }}><CardContent><Typography color="text.secondary" gutterBottom>Active Users</Typography><Typography variant="h4">{stats.activeUsersCount}</Typography><Typography variant="body2" color="text.secondary">of {stats.totalUsersCount}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ height:'100%' }}><CardContent><Typography color="text.secondary" gutterBottom>Common Action</Typography><Tooltip title={stats.mostCommonAction}><Typography variant="h6" noWrap>{stats.mostCommonAction}</Typography></Tooltip></CardContent></Card></Grid>
        <Grid item xs={12} sm={6} md={3}><Card sx={{ height:'100%' }}><CardContent><Typography color="text.secondary" gutterBottom>Peak Hour</Typography><Typography variant="h4">{stats.mostActiveHour>=0?`${stats.mostActiveHour%12||12}${stats.mostActiveHour>=12?'PM':'AM'}`:'N/A'}</Typography></CardContent></Card></Grid>
      </Grid>

      {/* Timeframe */}
      <Box sx={{ display:'flex', justifyContent:'center', mb:3 }}><ButtonGroup variant="outlined">{['day','week','month','year'].map(tf=><Button key={tf} onClick={()=>setTimeFrame(tf)} variant={timeFrame===tf?'contained':'outlined'}>{tf}</Button>)}</ButtonGroup></Box>

      {/* Charts */}
      {loading ? <Box sx={{ display:'flex', justifyContent:'center', py:4 }}><CircularProgress/></Box> : <>
        <Paper sx={{ p:3, mb:4 }}><Typography variant="h6"><TimelineIcon sx={{ mr:1 }}/>Activity Trends</Typography>{filteredLogs.length? <Box sx={{ height:300 }}><Line data={lineChartData} options={chartOptions}/></Box>: <Typography align="center" sx={{ py:4 }}>No data</Typography>}</Paper>
        <Grid container spacing={3} sx={{ mb:4 }}>
          <Grid item xs={12} md={6}><Paper sx={{ p:3, height:'100%' }}><Typography variant="h6">Distribution</Typography>{filteredLogs.length?<Box sx={{ height:300 }}><Pie data={pieChartData} options={{...chartOptions, plugins:{legend:{position:'right'}}}}/></Box>:<Typography align="center">No data</Typography>}</Paper></Grid>
          <Grid item xs={12} md={6}><Paper sx={{ p:3, height:'100%' }}><Typography variant="h6">User Comparison</Typography>{filteredLogs.length?<Box sx={{ height:300 }}><Bar data={barChartData} options={{...chartOptions, plugins:{legend:{display:false}}}}/></Box>:<Typography align="center">No data</Typography>}</Paper></Grid>
        </Grid>
      </>}

      {/* Recent Table */}
      <Paper sx={{ p:3, mb:4 }}><Typography variant="h6">Recent Activities</Typography><TableContainer><Table><TableHead><TableRow><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Time</TableCell><TableCell>Detail</TableCell></TableRow></TableHead><TableBody>{recentActivities.length?recentActivities.map(log=><TableRow key={log.id}><TableCell>{getUserName(log.targetUserId||log.userId)}</TableCell><TableCell><Chip label={log.action}/></TableCell><TableCell>{formatTimestamp(log.timestamp)}</TableCell><TableCell>{log.sentence? <Tooltip title={log.sentence}><Typography noWrap sx={{maxWidth:200}}>{log.sentence}</Typography></Tooltip>: log.wordAdded?`Added "${log.wordAdded}"`:null}</TableCell></TableRow>):<TableRow><TableCell colSpan={4} align="center">No recent</TableCell></TableRow>}</TableBody></Table></TableContainer></Paper>

      {/* Snackbar */}
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={()=>setOpenSnackbar(false)} message={snackbarMessage}/>
    </Container>
  );
}
