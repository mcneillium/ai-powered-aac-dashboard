// src/pages/AdminDashboard.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
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
  FormControlLabel,
  Switch,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FilterListIcon from '@mui/icons-material/FilterList';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Charts } from '../components/DashboardCharts';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Data states
  // const [caregivers, setCaregivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFrame, setTimeFrame] = useState('week');

  // Visibility toggles (no unmount, just hide)
  const [showCharts, setShowCharts] = useState(true);
  const [showActivities, setShowActivities] = useState(true);

  // Date calculations
  const dates = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { today, yesterday };
  }, []);

  const getUserName = useCallback(
    id => {
      if (!id) return 'Unknown';
      const u = users.find(u => u.id === id);
      return u ? (u.name || u.email || id) : 'Unknown';
    },
    [users]
  );

  // Fetch functions (only on mount)
  // const fetchCaregivers = useCallback(async () => {
  //   try {
  //     const snap = await get(ref(db, 'caregivers'));
  //     const data = snap.val() || {};
  //     setCaregivers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await get(ref(db, 'users'));
      const data = snap.val() || {};
      setUsers(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const snap = await get(
        query(ref(db, 'userLogs'), orderByChild('timestamp'), limitToLast(100))
      );
      const data = snap.val() || {};
      let arr = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      arr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(arr);

      const now = Date.now();
      const recent = arr.filter(l => l.timestamp && now - l.timestamp < 10 * 60 * 1000);
      if (recent.length) {
        setNotifications(recent);
        const top = recent[0];
        setSnackbarMessage(
          `${getUserName(top.targetUserId || top.userId)} ${top.action || 'performed action'}`
        );
        setOpenSnackbar(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [getUserName]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchLogs()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchUsers, fetchLogs]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Filter logs (memoized)
  const filteredLogs = useMemo(
    () =>
      logs.filter(l => {
        if (!l.timestamp) return false;
        const d = new Date(l.timestamp);
        if (startDate && d < new Date(startDate).setHours(0,0,0,0)) return false;
        if (endDate && d > new Date(endDate).setHours(23,59,59,999)) return false;
        if (actionFilter && !l.action?.toLowerCase().includes(actionFilter.toLowerCase())) return false;
        if (
          userFilter !== 'all' &&
          l.userId !== userFilter &&
          l.targetUserId !== userFilter
        ) return false;
        return true;
      }),
    [logs, startDate, endDate, actionFilter, userFilter]
  );

  // Chart data
  const lineData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      const d = new Date(l.timestamp);
      let key;
      if (timeFrame === 'day') key = `${d.getHours()}:00`;
      else if (timeFrame === 'week') key = d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
      else if (timeFrame === 'month') key = `${d.getDate()}/${d.getMonth()+1}`;
      else key = d.toLocaleDateString('en-US', { month:'short' });
      counts[key] = (counts[key] || 0) + 1;
    });
    return { labels: Object.keys(counts).sort(), datasets: [{ label:'Activities', data:Object.keys(counts).sort().map(k=>counts[k]) }] };
  }, [filteredLogs, timeFrame]);

  const pieData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      const t = l.action?.split(' ')[0]||'Unknown';
      counts[t] = (counts[t]||0)+1;
    });
    const labels = Object.keys(counts);
    return { labels, datasets:[{ data:labels.map(k=>counts[k]) }] };
  }, [filteredLogs]);

  const barData = useMemo(() => {
    const ua = {};
    filteredLogs.forEach(l=>{
      const n = getUserName(l.targetUserId||l.userId);
      ua[n]=(ua[n]||0)+1;
    });
    const labels = Object.keys(ua).sort((a,b)=>ua[b]-ua[a]).slice(0,10);
    return { labels, datasets:[{ label:'Activities', data:labels.map(l=>ua[l]) }] };
  }, [filteredLogs, getUserName]);

  // Stats & Recent
  const recent = useMemo(() => filteredLogs.slice(0,10), [filteredLogs]);
  const stats = useMemo(() => {
    const {today,yesterday} = dates;
    const tl = logs.filter(l=>new Date(l.timestamp).toDateString()===today.toDateString());
    const yl = logs.filter(l=>new Date(l.timestamp).toDateString()===yesterday.toDateString());
    const usersSet = new Set(tl.map(l=>l.targetUserId||l.userId));
    const counts = {};
    tl.forEach(l=>{ counts[l.action] = (counts[l.action]||0)+1; });
    const mc = Object.entries(counts).reduce((m,[k,v])=>v>m[1]?[k,v]:m,['None',0])[0];
    const hc = {};
    tl.forEach(l=>{ const h=new Date(l.timestamp).getHours(); hc[h]=(hc[h]||0)+1; });
    const ph = Object.entries(hc).reduce((m,[h,v])=>v>m[1]?[+h,v]:m,[-1,0])[0];
    const pc = yl.length ? Math.round((tl.length-yl.length)/yl.length*100): tl.length?100:0;
    return { todayCount:tl.length, activeUsersCount:usersSet.size, totalUsersCount:users.length, mostCommonAction:mc, mostActiveHour:ph, percentChange:pc };
  },[logs,dates,users]);

  const formatTS = useCallback(ts => ts? new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Unknown',[]);
  const clearFilters = useCallback(()=>{ setStartDate(null); setEndDate(null); setActionFilter(''); setUserFilter('all'); },[]);

  return (
    <Container maxWidth="xl" sx={{ backgroundColor:'background.default', minHeight:'100vh', py:4 }}>
      {/* Header + management */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">{isAdmin?'Admin Dashboard':'Dashboard'}</Typography>
        <Box>
          <ButtonGroup variant="contained" sx={{ mr:2 }}>
            <Button component={Link} to="/user-management">Users</Button>
            <Button component={Link} to="/Caregivers">Caregivers</Button>
            <Button component={Link} to="/Logs">Logs</Button>
            <Button component={Link} to="/notifications">Notifications</Button>
          </ButtonGroup>
          <IconButton onClick={refreshAll} disabled={refreshing} color="primary">
            <RefreshIcon/>
          </IconButton>
          <Badge badgeContent={notifications.length} color="error" sx={{ ml:2 }}>
            <NotificationsIcon/>
          </Badge>
        </Box>
      </Box>

      {/* Visibility toggles */}
      <Box display="flex" gap={4} mb={4}>
        <FormControlLabel
          control={<Switch checked={showCharts} onChange={e=>setShowCharts(e.target.checked)}/>}  label="Show Charts" />
        <FormControlLabel
          control={<Switch checked={showActivities} onChange={e=>setShowActivities(e.target.checked)}/>} label="Show Activities" />
      </Box>

      {/* Filters panel */}
      <Paper elevation={3} sx={{ p:3, mb:4, borderRadius:2 }}>
        <Box display="flex" alignItems="center" mb={2}><FilterListIcon sx={{mr:1}}/><Typography variant="h6">Filters</Typography></Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><LocalizationProvider dateAdapter={AdapterDateFns}><DatePicker label="Start Date" value={startDate} onChange={setStartDate} slotProps={{textField:{fullWidth:true}}}/></LocalizationProvider></Grid>
          <Grid item xs={12} md={3}><LocalizationProvider dateAdapter={AdapterDateFns}><DatePicker label="End Date" value={endDate} onChange={setEndDate} slotProps={{textField:{fullWidth:true}}}/></LocalizationProvider></Grid>
          <Grid item xs={12} md={3}><TextField label="Action" fullWidth value={actionFilter} onChange={e=>setActionFilter(e.target.value)}/></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>User</InputLabel><Select value={userFilter} label="User" onChange={e=>setUserFilter(e.target.value)}><MenuItem value="all">All</MenuItem>{users.map(u=><MenuItem key={u.id} value={u.id}>{u.name||u.email||u.id}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12}><Button variant="outlined" onClick={clearFilters}>Clear Filters</Button></Grid>
        </Grid>
      </Paper>

      {/* Stats */}
      <Grid container spacing={3} mb={4}>
        {[
          { label: "Today's Activities", value: stats.todayCount, change: stats.percentChange },
          { label: 'Active Users', value: stats.activeUsersCount, sub: `of ${stats.totalUsersCount}` },
          { label: 'Common Action', value: stats.mostCommonAction },
          { label: 'Peak Hour', value: stats.mostActiveHour >= 0 ? `${stats.mostActiveHour%12||12}${stats.mostActiveHour>=12?'PM':'AM'}` : 'N/A' }
        ].map((card,i)=>(
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card elevation={3} sx={{ borderRadius:2 }}>
              <CardContent>
                <Typography color="text.secondary">{card.label}</Typography>
                <Typography variant="h4">{card.value}</Typography>
                {card.change!==undefined && <Typography color={card.change>=0?'success.main':'error.main'}>{card.change>=0?'↑':'↓'}{Math.abs(card.change)}%</Typography>}
                {card.sub && <Typography color="text.secondary">{card.sub}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Timeframe selector */}
      <Box display="flex" justifyContent="center" mb={3}>
        <ButtonGroup variant="outlined">
          {['day','week','month','year'].map(tf=>(
            <Button key={tf} onClick={()=>setTimeFrame(tf)} variant={timeFrame===tf?'contained':'outlined'}>{tf.charAt(0).toUpperCase()+tf.slice(1)}</Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Charts section (hidden via CSS) */}
      <Box sx={{ display: showCharts ? 'block':'none' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress/></Box>
        ) : (
          <Paper elevation={3} sx={{ p:3, mb:4, borderRadius:2 }}>
            <Typography variant="h6"><TimelineIcon sx={{mr:1}}/> Activity Trends</Typography>
            <Charts lineData={lineData} pieData={pieData} barData={barData}/>
          </Paper>
        )}
      </Box>

      {/* Recent Activities section (hidden via CSS) */}
      <Box sx={{ display: showActivities ? 'block':'none' }}>
        <Paper elevation={3} sx={{ p:3, mb:4, borderRadius:2 }}>
          <Typography variant="h6">Recent Activities</Typography>
          <TableContainer>
            <Table>
              <TableHead><TableRow><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Time</TableCell><TableCell>Detail</TableCell></TableRow></TableHead>
              <TableBody>{recent.length? recent.map(l=>(
                <TableRow key={l.id}>
                  <TableCell>{getUserName(l.targetUserId||l.userId)}</TableCell>
                  <TableCell><Chip label={l.action||'Unknown'} size="small" variant="outlined" /></TableCell>
                  <TableCell>{formatTS(l.timestamp)}</TableCell>
                  <TableCell>{l.sentence||''}</TableCell>
                </TableRow>
              )): <TableRow><TableCell colSpan={4} align="center">No recent activities</TableCell></TableRow>}</TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

        <Snackbar
    open={openSnackbar}
    autoHideDuration={6000}
    onClose={() => setOpenSnackbar(false)}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    message={
      <span>
        🔔 {snackbarMessage}
      </span>
    }
    action={
      <Button 
        color="secondary" 
        size="small" 
        onClick={() => {
          setOpenSnackbar(false);
          navigate('/logs');
        }}
      >
        View Logs
      </Button>
    }
  />
    </Container>
  );
}
