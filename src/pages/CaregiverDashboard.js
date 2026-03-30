// src/pages/CaregiverDashboard.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Container, Grid, Card, CardContent,
  CardActionArea, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Alert, Divider, List, ListItem,
  ListItemText, IconButton, Tooltip, Skeleton, Snackbar, TextField,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SyncStatusCard from '../components/SyncStatusCard';
import { downloadCSV } from '../utils/csv';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title as ChartTitle, Tooltip as ChartTooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, ChartTooltip, Legend, Filler);

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

function toDateInputValue(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

function safeName(name) {
  return (name || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function SectionCard({ title, icon, loading, error, empty, emptyText, onRetry, actions, children }) {
  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {actions}
          {error && onRetry && (
            <Tooltip title="Retry">
              <IconButton size="small" onClick={onRetry}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {loading ? (
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="rounded" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={20} sx={{ mb: 1 }} width="80%" />
          <Skeleton variant="rounded" height={20} width="60%" />
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <ErrorOutlineIcon fontSize="small" />
          <Typography variant="body2">Failed to load. {onRetry ? 'Click retry.' : ''}</Typography>
        </Box>
      ) : empty ? (
        <Typography variant="body2" color="text.secondary">{emptyText || 'No data yet.'}</Typography>
      ) : children}
    </Paper>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assignedUsers, setAssignedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [assignLoading, setAssignLoading] = useState(true);
  const [assignError, setAssignError] = useState(null);

  const [userLogs, setUserLogs] = useState([]);
  const [customVocab, setCustomVocab] = useState([]);
  const [vocabRequests, setVocabRequests] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [vocabError, setVocabError] = useState(false);
  const [requestsError, setRequestsError] = useState(false);

  // Date range filter
  const [dateRange, setDateRange] = useState('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const selectedUser = assignedUsers.find((u) => u.uid === selectedUserId) || null;

  // ── Date range bounds ─────────────────────────────────────────────────────

  const dateFilter = useMemo(() => {
    const now = Date.now();
    if (dateRange === '7d') return { from: now - 7 * DAY_MS, to: now };
    if (dateRange === '30d') return { from: now - 30 * DAY_MS, to: now };
    if (dateRange === 'all') return { from: 0, to: now };
    if (dateRange === 'custom') {
      return {
        from: customFrom ? new Date(customFrom).getTime() : 0,
        to: customTo ? new Date(customTo).getTime() + DAY_MS - 1 : now,
      };
    }
    return { from: 0, to: now };
  }, [dateRange, customFrom, customTo]);

  const filteredLogs = useMemo(() =>
    userLogs.filter((l) => l.timestamp >= dateFilter.from && l.timestamp <= dateFilter.to),
    [userLogs, dateFilter]
  );

  // ── Load assignments ──────────────────────────────────────────────────────

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    setAssignLoading(true);
    setAssignError(null);

    const unsub = onValue(ref(db, `caregiverAssignments/${uid}`), async (snap) => {
      try {
        const assignments = snap.val() || {};
        const uids = Object.keys(assignments).filter((k) => assignments[k] === true);
        if (!uids.length) { setAssignedUsers([]); setAssignLoading(false); return; }
        const users = [];
        for (const u of uids) {
          try {
            const s = await get(ref(db, `users/${u}`));
            if (s.exists()) users.push({ uid: u, ...s.val() });
          } catch { /* skip */ }
        }
        setAssignedUsers(users);
        if (users.length > 0 && (!selectedUserId || !users.find((u) => u.uid === selectedUserId))) {
          setSelectedUserId(users[0].uid);
        }
      } catch { setAssignError('Failed to load assigned users.'); }
      finally { setAssignLoading(false); }
    }, () => { setAssignError('Connection error.'); setAssignLoading(false); });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Load per-user data ────────────────────────────────────────────────────

  const loadLogs = useCallback((uid) => {
    setLogsLoading(true); setLogsError(false);
    get(query(ref(db, `userLogs/${uid}`), orderByChild('timestamp'), limitToLast(500)))
      .then((snap) => {
        const data = snap.val() || {};
        setUserLogs(Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      })
      .catch(() => { setLogsError(true); setUserLogs([]); })
      .finally(() => setLogsLoading(false));
  }, []);

  const loadVocab = useCallback((uid) => {
    setVocabLoading(true); setVocabError(false);
    get(ref(db, `customVocab/${uid}`))
      .then((snap) => {
        const data = snap.val();
        if (Array.isArray(data)) setCustomVocab(data.map((v, i) => typeof v === 'string' ? { id: String(i), word: v } : { id: String(i), ...v }));
        else if (data && typeof data === 'object') setCustomVocab(Object.entries(data).map(([id, v]) => typeof v === 'string' ? { id, word: v } : { id, ...v }));
        else setCustomVocab([]);
      })
      .catch(() => { setVocabError(true); setCustomVocab([]); })
      .finally(() => setVocabLoading(false));
  }, []);

  const loadRequests = useCallback((uid) => {
    setRequestsLoading(true); setRequestsError(false);
    get(ref(db, `vocabRequests/${uid}`))
      .then((snap) => {
        const data = snap.val();
        if (data && typeof data === 'object') setVocabRequests(Object.entries(data).map(([id, v]) => typeof v === 'string' ? { id, word: v } : { id, ...v }));
        else setVocabRequests([]);
      })
      .catch(() => { setRequestsError(true); setVocabRequests([]); })
      .finally(() => setRequestsLoading(false));
  }, []);

  const loadAll = useCallback((uid) => { if (!uid) return; loadLogs(uid); loadVocab(uid); loadRequests(uid); }, [loadLogs, loadVocab, loadRequests]);

  useEffect(() => {
    if (selectedUserId) { setUserLogs([]); setCustomVocab([]); setVocabRequests([]); loadAll(selectedUserId); }
  }, [selectedUserId, loadAll]);

  // ── Insights computed from filtered logs ──────────────────────────────────

  const insights = useMemo(() => {
    let wordsTapped = 0, sentencesSpoken = 0, suggestionsShown = 0, suggestionsAccepted = 0;
    const wordCounts = {}, phraseCounts = {}, missingSet = {};

    for (const log of filteredLogs) {
      const action = (log.action || '').toLowerCase();
      if (action.includes('tap') || action.includes('button_press') || action.includes('word_select')) {
        wordsTapped++;
        const w = log.word || log.label || log.details || '';
        if (w) wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
      if (action.includes('sentence') || action.includes('speak') || action.includes('phrase')) {
        sentencesSpoken++;
        const p = log.phrase || log.sentence || log.details || '';
        if (p) phraseCounts[p] = (phraseCounts[p] || 0) + 1;
      }
      if (action.includes('suggestion')) { suggestionsShown++; if (action.includes('accept')) suggestionsAccepted++; }
      if (action.includes('search') || action.includes('missing') || action.includes('not_found')) {
        const t = log.searchTerm || log.word || log.details || '';
        if (t) missingSet[t] = (missingSet[t] || 0) + 1;
      }
    }
    const sortDesc = (obj) => Object.entries(obj).sort(([, a], [, b]) => b - a);
    return {
      wordsTapped, sentencesSpoken, vocabSize: customVocab.length,
      suggestionAcceptRate: suggestionsShown > 0 ? Math.round((suggestionsAccepted / suggestionsShown) * 100) : 0,
      missingWords: sortDesc(missingSet).slice(0, 10),
      frequentPhrases: sortDesc(phraseCounts).slice(0, 10),
      mostUsedWords: sortDesc(wordCounts).slice(0, 15),
    };
  }, [filteredLogs, customVocab]);

  // ── Usage trend chart data ────────────────────────────────────────────────

  const trendData = useMemo(() => {
    if (!filteredLogs.length) return null;

    const buckets = {};
    for (const log of filteredLogs) {
      const day = toDateInputValue(log.timestamp);
      if (!buckets[day]) buckets[day] = { taps: 0, sentences: 0, total: 0 };
      buckets[day].total++;
      const action = (log.action || '').toLowerCase();
      if (action.includes('tap') || action.includes('button_press') || action.includes('word_select')) buckets[day].taps++;
      if (action.includes('sentence') || action.includes('speak') || action.includes('phrase')) buckets[day].sentences++;
    }

    const days = Object.keys(buckets).sort();
    return {
      labels: days,
      datasets: [
        { label: 'Words Tapped', data: days.map((d) => buckets[d].taps), borderColor: '#2979FF', backgroundColor: 'rgba(41,121,255,0.1)', fill: true, tension: 0.3 },
        { label: 'Sentences', data: days.map((d) => buckets[d].sentences), borderColor: '#2E7D32', backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 },
        { label: 'Total Events', data: days.map((d) => buckets[d].total), borderColor: '#9E9E9E', borderDash: [4, 4], fill: false, tension: 0.3, pointRadius: 0 },
      ],
    };
  }, [filteredLogs]);

  const chartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  // ── CSV export helpers ────────────────────────────────────────────────────

  const dateLabel = dateRange === 'custom'
    ? `${customFrom || 'start'}_to_${customTo || 'now'}`
    : dateRange;

  const exportLogs = () => {
    const name = safeName(selectedUser?.name);
    const rows = filteredLogs.map((l) => ({
      date: l.timestamp ? new Date(l.timestamp).toISOString() : '',
      action: l.action || '',
      word: l.word || l.label || '',
      phrase: l.phrase || l.sentence || '',
      details: l.details || '',
    }));
    downloadCSV(rows, `${name}-activity-${dateLabel}`, ['date', 'action', 'word', 'phrase', 'details']);
    toast('Activity logs exported');
  };

  const exportVocab = () => {
    const name = safeName(selectedUser?.name);
    const rows = customVocab.map((v) => ({ word: v.word || v.label || v.text || '' }));
    downloadCSV(rows, `${name}-vocabulary`, ['word']);
    toast('Vocabulary exported');
  };

  const exportInsights = () => {
    const name = safeName(selectedUser?.name);
    const rows = [];
    rows.push({ category: 'Report', item: 'User', value: selectedUser?.name || '' });
    rows.push({ category: 'Report', item: 'Date Range', value: dateLabel });
    rows.push({ category: 'Report', item: 'Generated', value: new Date().toISOString() });
    rows.push({ category: 'Summary', item: 'Words Tapped', value: insights.wordsTapped });
    rows.push({ category: 'Summary', item: 'Sentences Spoken', value: insights.sentencesSpoken });
    rows.push({ category: 'Summary', item: 'Vocabulary Size', value: insights.vocabSize });
    rows.push({ category: 'Summary', item: 'Suggestion Accept Rate', value: `${insights.suggestionAcceptRate}%` });
    for (const [word, count] of insights.mostUsedWords) rows.push({ category: 'Most Used Words', item: word, value: count });
    for (const [phrase, count] of insights.frequentPhrases) rows.push({ category: 'Frequent Phrases', item: phrase, value: count });
    for (const [word, count] of insights.missingWords) rows.push({ category: 'Missing Words', item: word, value: count });
    for (const req of vocabRequests) rows.push({ category: 'Vocab Requests', item: req.word || req.term || '', value: '' });
    downloadCSV(rows, `${name}-insights-${dateLabel}`, ['category', 'item', 'value']);
    toast('Insights report exported');
  };

  const toast = (msg) => { setSnackMsg(msg); setSnackOpen(true); };

  const copyList = (items, label) => {
    const text = items.map(([word, count]) => `${word} (${count})`).join('\n');
    navigator.clipboard.writeText(text).then(() => toast(`${label} copied`)).catch(() => toast('Copy failed'));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (assignLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={20} sx={{ mb: 3 }} />
        <Grid container spacing={1}>{[1, 2, 3].map((i) => <Grid item xs={6} sm={4} md={3} key={i}><Skeleton variant="rounded" height={70} /></Grid>)}</Grid>
      </Container>
    );
  }

  if (assignError) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => window.location.reload()}>Retry</Button>}>{assignError}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4">Caregiver Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Monitor usage and vocabulary for your assigned users</Typography>
        </Box>
        {selectedUserId && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export insights report (CSV)">
              <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportInsights}>Report</Button>
            </Tooltip>
            <Tooltip title="Refresh"><IconButton onClick={() => loadAll(selectedUserId)}><RefreshIcon /></IconButton></Tooltip>
          </Box>
        )}
      </Box>

      {assignedUsers.length === 0 ? (
        <Alert severity="info">No users assigned to you yet. Ask an admin to assign users to your account.</Alert>
      ) : (
        <>
          {/* User selector */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Select user ({assignedUsers.length} assigned)</Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {assignedUsers.map((user) => {
              const sel = selectedUserId === user.uid;
              return (
                <Grid item xs={6} sm={4} md={3} key={user.uid}>
                  <Card elevation={sel ? 4 : 0} variant={sel ? 'elevation' : 'outlined'}
                    sx={{ borderColor: sel ? 'primary.main' : 'divider', borderWidth: sel ? 2 : 1, transition: 'all 0.15s ease' }}>
                    <CardActionArea onClick={() => setSelectedUserId(user.uid)} sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" noWrap fontWeight={sel ? 700 : 500}>{user.name || 'Unnamed'}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{user.email || ''}</Typography>
                      <SyncStatusCard userId={user.uid} compact />
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {selectedUser && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h5">{selectedUser.name || selectedUser.email || 'User'}</Typography>
                <SyncStatusCard userId={selectedUser.uid} />
              </Box>

              {/* ── Date range filter ── */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <ToggleButtonGroup size="small" exclusive value={dateRange} onChange={(_, v) => { if (v) setDateRange(v); }}>
                  <ToggleButton value="7d">7 days</ToggleButton>
                  <ToggleButton value="30d">30 days</ToggleButton>
                  <ToggleButton value="all">All time</ToggleButton>
                  <ToggleButton value="custom">Custom</ToggleButton>
                </ToggleButtonGroup>
                {dateRange === 'custom' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField type="date" size="small" label="From" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField type="date" size="small" label="To" value={customTo} onChange={(e) => setCustomTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  {filteredLogs.length} events{dateRange !== 'all' ? ` in range` : ''}
                </Typography>
              </Box>

              {/* ── Usage overview cards ── */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}><StatCard icon={<TouchAppIcon />} label="Words Tapped" value={logsLoading ? null : insights.wordsTapped} color="primary.main" loading={logsLoading} /></Grid>
                <Grid item xs={6} sm={3}><StatCard icon={<RecordVoiceOverIcon />} label="Sentences Spoken" value={logsLoading ? null : insights.sentencesSpoken} color="success.main" loading={logsLoading} /></Grid>
                <Grid item xs={6} sm={3}><StatCard icon={<MenuBookIcon />} label="Vocabulary Size" value={vocabLoading ? null : insights.vocabSize} color="info.main" loading={vocabLoading} /></Grid>
                <Grid item xs={6} sm={3}><StatCard icon={<ThumbUpIcon />} label="Suggestion Accept" value={logsLoading ? null : `${insights.suggestionAcceptRate}%`} color="warning.main" loading={logsLoading} /></Grid>
              </Grid>

              {/* ── Usage trend chart ── */}
              {!logsLoading && trendData && trendData.labels.length > 1 && (
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Usage Trends</Typography>
                  <Box sx={{ height: 220 }}>
                    <Line data={trendData} options={chartOptions} />
                  </Box>
                </Paper>
              )}

              {/* ── Vocabulary insights ── */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Missing Searched Words" icon={<SearchOffIcon color="error" fontSize="small" />}
                    loading={logsLoading} error={logsError}
                    empty={insights.missingWords.length === 0 && vocabRequests.length === 0}
                    emptyText="No missing words or vocab requests recorded yet."
                    onRetry={() => { loadLogs(selectedUserId); loadRequests(selectedUserId); }}
                    actions={insights.missingWords.length > 0 && <Tooltip title="Copy list"><IconButton size="small" onClick={() => copyList(insights.missingWords, 'Missing words')}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>}
                  >
                    {insights.missingWords.length > 0 && (
                      <Box sx={{ mb: vocabRequests.length > 0 ? 2 : 0 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {insights.missingWords.map(([word, count]) => <Chip key={word} label={`${word} (${count})`} size="small" color="error" variant="outlined" />)}
                        </Box>
                      </Box>
                    )}
                    {vocabRequests.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Vocab requests</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {vocabRequests.slice(0, 15).map((r) => <Chip key={r.id} label={r.word || r.term || r.id} size="small" variant="outlined" />)}
                          {vocabRequests.length > 15 && <Chip label={`+${vocabRequests.length - 15} more`} size="small" />}
                        </Box>
                      </Box>
                    )}
                  </SectionCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <SectionCard title="Frequent Phrases to Promote" icon={<TrendingUpIcon color="success" fontSize="small" />}
                    loading={logsLoading} error={logsError} empty={insights.frequentPhrases.length === 0}
                    emptyText="No phrase data yet. Usage patterns will appear as the user communicates."
                    onRetry={() => loadLogs(selectedUserId)}
                    actions={insights.frequentPhrases.length > 0 && <Tooltip title="Copy list"><IconButton size="small" onClick={() => copyList(insights.frequentPhrases, 'Phrases')}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>}
                  >
                    <List dense disablePadding>
                      {insights.frequentPhrases.map(([phrase, count]) => (
                        <ListItem key={phrase} disableGutters><ListItemText primary={phrase} secondary={`Used ${count} time${count > 1 ? 's' : ''}`} /></ListItem>
                      ))}
                    </List>
                  </SectionCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <SectionCard title="Most Used Words" icon={<StarIcon color="warning" fontSize="small" />}
                    loading={logsLoading} error={logsError} empty={insights.mostUsedWords.length === 0}
                    emptyText="No word usage data yet."
                    onRetry={() => loadLogs(selectedUserId)}
                    actions={insights.mostUsedWords.length > 0 && <Tooltip title="Copy list"><IconButton size="small" onClick={() => copyList(insights.mostUsedWords, 'Words')}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {insights.mostUsedWords.map(([word, count]) => <Chip key={word} label={`${word} (${count})`} size="small" color="primary" variant="outlined" />)}
                    </Box>
                  </SectionCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <SectionCard title={`Custom Vocabulary (${vocabLoading ? '...' : customVocab.length})`}
                    icon={<FormatListBulletedIcon color="info" fontSize="small" />}
                    loading={vocabLoading} error={vocabError} empty={customVocab.length === 0}
                    emptyText="No custom vocabulary added yet."
                    onRetry={() => loadVocab(selectedUserId)}
                    actions={customVocab.length > 0 && (
                      <Tooltip title="Export vocabulary (CSV)">
                        <IconButton size="small" onClick={exportVocab}><FileDownloadIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {customVocab.slice(0, 30).map((item, i) => <Chip key={item.id || i} label={item.word || item.label || item.text || String(item)} size="small" variant="outlined" />)}
                      {customVocab.length > 30 && <Chip label={`+${customVocab.length - 30} more`} size="small" />}
                    </Box>
                  </SectionCard>
                </Grid>
              </Grid>

              {/* ── Recent activity log ── */}
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Recent Activity ({filteredLogs.length})</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {filteredLogs.length > 0 && (
                      <Tooltip title="Export logs (CSV)">
                        <Button size="small" startIcon={<FileDownloadIcon />} onClick={exportLogs}>Export</Button>
                      </Tooltip>
                    )}
                    <Button size="small" onClick={() => navigate('/logs')}>View All</Button>
                    <Tooltip title="Refresh"><IconButton size="small" onClick={() => loadLogs(selectedUserId)}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                </Box>
                {logsLoading ? (
                  <Box>{[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={32} sx={{ mb: 1 }} />)}</Box>
                ) : logsError ? (
                  <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => loadLogs(selectedUserId)}>Retry</Button>}>Failed to load activity logs.</Alert>
                ) : filteredLogs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No activity in selected date range.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Action</TableCell><TableCell>Details</TableCell><TableCell>When</TableCell></TableRow></TableHead>
                      <TableBody>
                        {filteredLogs.slice(0, 20).map((log) => (
                          <TableRow key={log.id} hover>
                            <TableCell><Chip label={log.action || 'unknown'} size="small" variant="outlined" /></TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>{log.word || log.phrase || log.details || log.label || '—'}</Typography></TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </>
          )}
        </>
      )}

      <Snackbar open={snackOpen} autoHideDuration={2000} onClose={() => setSnackOpen(false)} message={snackMsg} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Container>
  );
}

function StatCard({ icon, label, value, color, loading }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ color, opacity: 0.8, display: 'flex' }}>{React.cloneElement(icon, { sx: { fontSize: 36 } })}</Box>
        <Box>
          {loading ? <Skeleton variant="text" width={50} height={36} /> : <Typography variant="h5" fontWeight={700}>{value}</Typography>}
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
