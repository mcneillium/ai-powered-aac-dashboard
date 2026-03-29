// src/pages/CaregiverDashboard.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Skeleton,
  Snackbar,
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
import SyncStatusCard from '../components/SyncStatusCard';

// ── Section wrapper with loading/error/empty states ─────────────────────────

function SectionCard({ title, icon, loading, error, empty, emptyText, onRetry, children }) {
  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
        </Box>
        {error && onRetry && (
          <Tooltip title="Retry">
            <IconButton size="small" onClick={onRetry}><RefreshIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
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
      ) : (
        children
      )}
    </Paper>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Assignment + user state
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [assignLoading, setAssignLoading] = useState(true);
  const [assignError, setAssignError] = useState(null);

  // Per-user data state
  const [userLogs, setUserLogs] = useState([]);
  const [customVocab, setCustomVocab] = useState([]);
  const [vocabRequests, setVocabRequests] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [vocabError, setVocabError] = useState(false);
  const [requestsError, setRequestsError] = useState(false);

  // Snackbar for copy feedback
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const selectedUser = assignedUsers.find((u) => u.uid === selectedUserId) || null;

  // ── Load assignments → then per-user profiles ─────────────────────────────

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;

    setAssignLoading(true);
    setAssignError(null);

    const assignRef = ref(db, `caregiverAssignments/${uid}`);
    const unsub = onValue(assignRef, async (snap) => {
      try {
        const assignments = snap.val() || {};
        const userUids = Object.keys(assignments).filter((k) => assignments[k] === true);

        if (userUids.length === 0) {
          setAssignedUsers([]);
          setAssignLoading(false);
          return;
        }

        const users = [];
        for (const userUid of userUids) {
          try {
            const userSnap = await get(ref(db, `users/${userUid}`));
            if (userSnap.exists()) {
              users.push({ uid: userUid, ...userSnap.val() });
            }
          } catch {
            // Individual user fetch failed — skip but don't break
          }
        }

        setAssignedUsers(users);
        // Auto-select first user if nothing selected or current selection is gone
        if (users.length > 0 && (!selectedUserId || !users.find((u) => u.uid === selectedUserId))) {
          setSelectedUserId(users[0].uid);
        }
      } catch {
        setAssignError('Failed to load assigned users.');
      } finally {
        setAssignLoading(false);
      }
    }, () => {
      setAssignError('Failed to load assignments. Check your connection.');
      setAssignLoading(false);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Load per-user data when selection changes ─────────────────────────────

  const loadLogs = useCallback((uid) => {
    setLogsLoading(true);
    setLogsError(false);
    get(query(ref(db, `userLogs/${uid}`), orderByChild('timestamp'), limitToLast(200)))
      .then((snap) => {
        const data = snap.val() || {};
        setUserLogs(
          Object.entries(data)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        );
      })
      .catch(() => { setLogsError(true); setUserLogs([]); })
      .finally(() => setLogsLoading(false));
  }, []);

  const loadVocab = useCallback((uid) => {
    setVocabLoading(true);
    setVocabError(false);
    get(ref(db, `customVocab/${uid}`))
      .then((snap) => {
        const data = snap.val();
        if (Array.isArray(data)) {
          setCustomVocab(data.map((v, i) => typeof v === 'string' ? { id: String(i), word: v } : { id: String(i), ...v }));
        } else if (data && typeof data === 'object') {
          setCustomVocab(Object.entries(data).map(([id, v]) =>
            typeof v === 'string' ? { id, word: v } : { id, ...v }
          ));
        } else {
          setCustomVocab([]);
        }
      })
      .catch(() => { setVocabError(true); setCustomVocab([]); })
      .finally(() => setVocabLoading(false));
  }, []);

  const loadRequests = useCallback((uid) => {
    setRequestsLoading(true);
    setRequestsError(false);
    get(ref(db, `vocabRequests/${uid}`))
      .then((snap) => {
        const data = snap.val();
        if (data && typeof data === 'object') {
          setVocabRequests(Object.entries(data).map(([id, v]) =>
            typeof v === 'string' ? { id, word: v } : { id, ...v }
          ));
        } else {
          setVocabRequests([]);
        }
      })
      .catch(() => { setRequestsError(true); setVocabRequests([]); })
      .finally(() => setRequestsLoading(false));
  }, []);

  const loadAllUserData = useCallback((uid) => {
    if (!uid) return;
    loadLogs(uid);
    loadVocab(uid);
    loadRequests(uid);
  }, [loadLogs, loadVocab, loadRequests]);

  useEffect(() => {
    if (selectedUserId) {
      // Clear stale data immediately when switching users
      setUserLogs([]);
      setCustomVocab([]);
      setVocabRequests([]);
      loadAllUserData(selectedUserId);
    }
  }, [selectedUserId, loadAllUserData]);

  // ── Compute insights from logs ────────────────────────────────────────────

  const insights = useMemo(() => {
    let wordsTapped = 0;
    let sentencesSpoken = 0;
    let suggestionsShown = 0;
    let suggestionsAccepted = 0;
    const wordCounts = {};
    const phraseCounts = {};
    const missingSet = {};

    for (const log of userLogs) {
      const action = (log.action || '').toLowerCase();

      if (action.includes('tap') || action.includes('button_press') || action.includes('word_select')) {
        wordsTapped++;
        const word = log.word || log.label || log.details || '';
        if (word) wordCounts[word] = (wordCounts[word] || 0) + 1;
      }

      if (action.includes('sentence') || action.includes('speak') || action.includes('phrase')) {
        sentencesSpoken++;
        const phrase = log.phrase || log.sentence || log.details || '';
        if (phrase) phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
      }

      if (action.includes('suggestion')) {
        suggestionsShown++;
        if (action.includes('accept')) suggestionsAccepted++;
      }

      if (action.includes('search') || action.includes('missing') || action.includes('not_found')) {
        const term = log.searchTerm || log.word || log.details || '';
        if (term) missingSet[term] = (missingSet[term] || 0) + 1;
      }
    }

    const sortDesc = (obj) => Object.entries(obj).sort(([, a], [, b]) => b - a);

    return {
      wordsTapped,
      sentencesSpoken,
      vocabSize: customVocab.length,
      suggestionAcceptRate: suggestionsShown > 0 ? Math.round((suggestionsAccepted / suggestionsShown) * 100) : 0,
      missingWords: sortDesc(missingSet).slice(0, 10),
      frequentPhrases: sortDesc(phraseCounts).slice(0, 10),
      mostUsedWords: sortDesc(wordCounts).slice(0, 15),
      recentLogs: userLogs.slice(0, 20),
    };
  }, [userLogs, customVocab]);

  // ── Copy helper ───────────────────────────────────────────────────────────

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackMsg(`${label} copied`);
      setSnackOpen(true);
    }).catch(() => {
      setSnackMsg('Copy failed');
      setSnackOpen(true);
    });
  };

  const copyList = (items, label) => {
    const text = items.map(([word, count]) => `${word} (${count})`).join('\n');
    copyToClipboard(text, label);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (assignLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={20} sx={{ mb: 3 }} />
        <Grid container spacing={1}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <Skeleton variant="rounded" height={70} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (assignError) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>Retry</Button>
        }>
          {assignError}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4">Caregiver Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor usage and vocabulary for your assigned users
          </Typography>
        </Box>
        {selectedUserId && (
          <Tooltip title="Refresh data">
            <IconButton onClick={() => loadAllUserData(selectedUserId)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* No assigned users */}
      {assignedUsers.length === 0 ? (
        <Alert severity="info">
          No users assigned to you yet. Ask an admin to assign users to your account.
        </Alert>
      ) : (
        <>
          {/* ── User selector ── */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Select user ({assignedUsers.length} assigned)
          </Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {assignedUsers.map((user) => {
              const isSelected = selectedUserId === user.uid;
              return (
                <Grid item xs={6} sm={4} md={3} key={user.uid}>
                  <Card
                    elevation={isSelected ? 4 : 0}
                    variant={isSelected ? 'elevation' : 'outlined'}
                    sx={{
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CardActionArea
                      onClick={() => setSelectedUserId(user.uid)}
                      sx={{ p: 1.5 }}
                    >
                      <Typography variant="subtitle2" noWrap fontWeight={isSelected ? 700 : 500}>
                        {user.name || 'Unnamed'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {user.email || ''}
                      </Typography>
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
                <Typography variant="h5">
                  {selectedUser.name || selectedUser.email || 'User'}
                </Typography>
                <SyncStatusCard userId={selectedUser.uid} />
              </Box>

              {/* ── Usage overview cards ── */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<TouchAppIcon />} label="Words Tapped"
                    value={logsLoading ? null : insights.wordsTapped}
                    color="primary.main" loading={logsLoading}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<RecordVoiceOverIcon />} label="Sentences Spoken"
                    value={logsLoading ? null : insights.sentencesSpoken}
                    color="success.main" loading={logsLoading}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<MenuBookIcon />} label="Vocabulary Size"
                    value={vocabLoading ? null : insights.vocabSize}
                    color="info.main" loading={vocabLoading}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<ThumbUpIcon />} label="Suggestion Accept"
                    value={logsLoading ? null : `${insights.suggestionAcceptRate}%`}
                    color="warning.main" loading={logsLoading}
                  />
                </Grid>
              </Grid>

              {/* ── Vocabulary insights ── */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Missing searched words */}
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Missing Searched Words"
                    icon={<SearchOffIcon color="error" fontSize="small" />}
                    loading={logsLoading}
                    error={logsError}
                    empty={insights.missingWords.length === 0 && vocabRequests.length === 0}
                    emptyText="No missing words or vocab requests recorded yet."
                    onRetry={() => { loadLogs(selectedUserId); loadRequests(selectedUserId); }}
                  >
                    {insights.missingWords.length > 0 && (
                      <Box sx={{ mb: vocabRequests.length > 0 ? 2 : 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">From searches</Typography>
                          <Tooltip title="Copy list">
                            <IconButton size="small" onClick={() => copyList(insights.missingWords, 'Missing words')}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {insights.missingWords.map(([word, count]) => (
                            <Chip key={word} label={`${word} (${count})`} size="small" color="error" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {vocabRequests.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Vocab requests</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {vocabRequests.slice(0, 15).map((req) => (
                            <Chip key={req.id} label={req.word || req.term || req.id} size="small" variant="outlined" />
                          ))}
                          {vocabRequests.length > 15 && (
                            <Chip label={`+${vocabRequests.length - 15} more`} size="small" />
                          )}
                        </Box>
                      </Box>
                    )}
                  </SectionCard>
                </Grid>

                {/* Frequent phrases to promote */}
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Frequent Phrases to Promote"
                    icon={<TrendingUpIcon color="success" fontSize="small" />}
                    loading={logsLoading}
                    error={logsError}
                    empty={insights.frequentPhrases.length === 0}
                    emptyText="No phrase data yet. Usage patterns will appear as the user communicates."
                    onRetry={() => loadLogs(selectedUserId)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                      <Tooltip title="Copy list">
                        <IconButton size="small" onClick={() => copyList(insights.frequentPhrases, 'Phrases')}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <List dense disablePadding>
                      {insights.frequentPhrases.map(([phrase, count]) => (
                        <ListItem key={phrase} disableGutters>
                          <ListItemText primary={phrase} secondary={`Used ${count} time${count > 1 ? 's' : ''}`} />
                        </ListItem>
                      ))}
                    </List>
                  </SectionCard>
                </Grid>

                {/* Most used words */}
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Most Used Words"
                    icon={<StarIcon color="warning" fontSize="small" />}
                    loading={logsLoading}
                    error={logsError}
                    empty={insights.mostUsedWords.length === 0}
                    emptyText="No word usage data yet."
                    onRetry={() => loadLogs(selectedUserId)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                      <Tooltip title="Copy list">
                        <IconButton size="small" onClick={() => copyList(insights.mostUsedWords, 'Words')}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {insights.mostUsedWords.map(([word, count]) => (
                        <Chip key={word} label={`${word} (${count})`} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </SectionCard>
                </Grid>

                {/* Custom vocabulary list */}
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title={`Custom Vocabulary (${vocabLoading ? '...' : customVocab.length})`}
                    icon={<FormatListBulletedIcon color="info" fontSize="small" />}
                    loading={vocabLoading}
                    error={vocabError}
                    empty={customVocab.length === 0}
                    emptyText="No custom vocabulary added yet."
                    onRetry={() => loadVocab(selectedUserId)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                      <Tooltip title="Copy all words">
                        <IconButton size="small" onClick={() => {
                          const text = customVocab.map((v) => v.word || v.label || v.text || '').filter(Boolean).join('\n');
                          copyToClipboard(text, 'Vocabulary');
                        }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {customVocab.slice(0, 30).map((item, i) => (
                        <Chip key={item.id || i} label={item.word || item.label || item.text || String(item)} size="small" variant="outlined" />
                      ))}
                      {customVocab.length > 30 && (
                        <Chip label={`+${customVocab.length - 30} more`} size="small" />
                      )}
                    </Box>
                  </SectionCard>
                </Grid>
              </Grid>

              {/* ── Recent activity log ── */}
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Recent Activity</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={() => navigate('/logs')}>View All</Button>
                    <Tooltip title="Refresh">
                      <IconButton size="small" onClick={() => loadLogs(selectedUserId)}>
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                {logsLoading ? (
                  <Box>
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} variant="rounded" height={32} sx={{ mb: 1 }} />
                    ))}
                  </Box>
                ) : logsError ? (
                  <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={() => loadLogs(selectedUserId)}>Retry</Button>
                  }>
                    Failed to load activity logs.
                  </Alert>
                ) : insights.recentLogs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No activity recorded yet.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Details</TableCell>
                          <TableCell>When</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {insights.recentLogs.map((log) => (
                          <TableRow key={log.id} hover>
                            <TableCell>
                              <Chip label={log.action || 'unknown'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>
                                {log.word || log.phrase || log.details || log.label || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                              </Typography>
                            </TableCell>
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

      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}

// ── Stat card with loading state ────────────────────────────────────────────

function StatCard({ icon, label, value, color, loading }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ color, opacity: 0.8, display: 'flex' }}>
          {React.cloneElement(icon, { sx: { fontSize: 36 } })}
        </Box>
        <Box>
          {loading ? (
            <Skeleton variant="text" width={50} height={36} />
          ) : (
            <Typography variant="h5" fontWeight={700}>{value}</Typography>
          )}
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
