// src/pages/CaregiverDashboard.js
import React, { useEffect, useState, useMemo } from 'react';
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
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SyncStatusCard from '../components/SyncStatusCard';

export default function CaregiverDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assignedUsers, setAssignedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [customVocab, setCustomVocab] = useState([]);
  const [vocabRequests, setVocabRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load assigned users
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;

    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const filtered = Object.entries(data)
        .filter(([, info]) => info.caregiverId === uid)
        .map(([id, info]) => ({ uid: id, ...info }));
      setAssignedUsers(filtered);
      // Auto-select first user if none selected
      if (filtered.length > 0 && !selectedUser) {
        setSelectedUser(filtered[0]);
      }
      setLoading(false);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Load data for selected user
  useEffect(() => {
    if (!selectedUser) return;
    const uid = selectedUser.uid;

    // Logs: /userLogs/{uid}
    const logsRef = ref(db, `userLogs/${uid}`);
    get(query(logsRef, orderByChild('timestamp'), limitToLast(200)))
      .then((snap) => {
        const data = snap.val() || {};
        const arr = Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setUserLogs(arr);
      })
      .catch(() => setUserLogs([]));

    // Also try top-level userLogs filtered by this user (legacy flat structure)
    // The mobile app may store logs at /userLogs (flat) with targetUserId/userId
    const flatLogsRef = ref(db, 'userLogs');
    get(query(flatLogsRef, orderByChild('timestamp'), limitToLast(500)))
      .then((snap) => {
        const data = snap.val() || {};
        const arr = Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .filter((l) => l.targetUserId === uid || l.userId === uid)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        // Merge: use per-user logs if they exist, otherwise flat logs
        setUserLogs((prev) => prev.length > 0 ? prev : arr);
      })
      .catch(() => {});

    // Custom vocab: /customVocab/{uid}
    const vocabRef = ref(db, `customVocab/${uid}`);
    get(vocabRef)
      .then((snap) => {
        const data = snap.val();
        if (Array.isArray(data)) {
          setCustomVocab(data);
        } else if (data && typeof data === 'object') {
          setCustomVocab(Object.entries(data).map(([id, v]) =>
            typeof v === 'string' ? { id, word: v } : { id, ...v }
          ));
        } else {
          setCustomVocab([]);
        }
      })
      .catch(() => setCustomVocab([]));

    // Vocab requests: /vocabRequests/{uid}
    const reqRef = ref(db, `vocabRequests/${uid}`);
    get(reqRef)
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
      .catch(() => setVocabRequests([]));
  }, [selectedUser]);

  // Compute insights from logs
  const insights = useMemo(() => {
    if (!userLogs.length) {
      return {
        wordsTapped: 0, sentencesSpoken: 0, vocabSize: customVocab.length,
        suggestionAcceptRate: 0, missingWords: [], frequentPhrases: [],
        mostUsedWords: [], recentLogs: [],
      };
    }

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

    const sortDesc = (obj) =>
      Object.entries(obj).sort(([, a], [, b]) => b - a);

    return {
      wordsTapped,
      sentencesSpoken,
      vocabSize: customVocab.length,
      suggestionAcceptRate: suggestionsShown > 0
        ? Math.round((suggestionsAccepted / suggestionsShown) * 100)
        : 0,
      missingWords: sortDesc(missingSet).slice(0, 10),
      frequentPhrases: sortDesc(phraseCounts).slice(0, 10),
      mostUsedWords: sortDesc(wordCounts).slice(0, 15),
      recentLogs: userLogs.slice(0, 20),
    };
  }, [userLogs, customVocab]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Caregiver Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor usage and vocabulary for your assigned users
        </Typography>
      </Box>

      {/* No users assigned */}
      {assignedUsers.length === 0 ? (
        <Alert severity="info" action={
          <Button color="inherit" size="small" onClick={() => navigate('/connect-user')}>
            Connect Users
          </Button>
        }>
          No users assigned yet. Connect to users to start monitoring their activity.
        </Alert>
      ) : (
        <>
          {/* User selector */}
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Select user ({assignedUsers.length} assigned)
          </Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {assignedUsers.map((user) => (
              <Grid item xs={6} sm={4} md={3} key={user.uid}>
                <Card
                  variant={selectedUser?.uid === user.uid ? 'elevation' : 'outlined'}
                  sx={{
                    borderColor: selectedUser?.uid === user.uid ? 'primary.main' : 'divider',
                    borderWidth: selectedUser?.uid === user.uid ? 2 : 1,
                  }}
                >
                  <CardActionArea onClick={() => setSelectedUser(user)} sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" noWrap>
                      {user.name || 'Unnamed'}
                    </Typography>
                    <SyncStatusCard userId={user.uid} compact />
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {selectedUser && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="h5" sx={{ mb: 2 }}>
                {selectedUser.name || selectedUser.email || 'User'}
              </Typography>

              {/* ── Usage overview cards ── */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<TouchAppIcon />}
                    label="Words Tapped"
                    value={insights.wordsTapped}
                    color="primary.main"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<RecordVoiceOverIcon />}
                    label="Sentences Spoken"
                    value={insights.sentencesSpoken}
                    color="success.main"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<MenuBookIcon />}
                    label="Vocabulary Size"
                    value={insights.vocabSize}
                    color="info.main"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<ThumbUpIcon />}
                    label="Suggestion Accept"
                    value={`${insights.suggestionAcceptRate}%`}
                    color="warning.main"
                  />
                </Grid>
              </Grid>

              {/* ── Vocabulary insights ── */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Missing / searched words */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <SearchOffIcon color="error" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Missing Searched Words
                      </Typography>
                    </Box>
                    {insights.missingWords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No missing words recorded yet.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {insights.missingWords.map(([word, count]) => (
                          <Chip
                            key={word}
                            label={`${word} (${count})`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}

                    {/* Vocab requests */}
                    {vocabRequests.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Vocab Requests
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {vocabRequests.slice(0, 15).map((req) => (
                            <Chip
                              key={req.id}
                              label={req.word || req.term || req.id}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Frequent phrases to promote */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TrendingUpIcon color="success" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Frequent Phrases to Promote
                      </Typography>
                    </Box>
                    {insights.frequentPhrases.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No phrase data yet. Usage patterns will appear here.
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {insights.frequentPhrases.map(([phrase, count]) => (
                          <ListItem key={phrase} disableGutters>
                            <ListItemText
                              primary={phrase}
                              secondary={`Used ${count} time${count > 1 ? 's' : ''}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Paper>
                </Grid>

                {/* Most used words */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <StarIcon color="warning" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Most Used Words
                      </Typography>
                    </Box>
                    {insights.mostUsedWords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No word usage data yet.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {insights.mostUsedWords.map(([word, count]) => (
                          <Chip
                            key={word}
                            label={`${word} (${count})`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Custom vocabulary list */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FormatListBulletedIcon color="info" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Custom Vocabulary ({customVocab.length})
                      </Typography>
                    </Box>
                    {customVocab.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No custom vocabulary added yet.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {customVocab.slice(0, 30).map((item, i) => (
                          <Chip
                            key={item.id || i}
                            label={item.word || item.label || item.text || String(item)}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {customVocab.length > 30 && (
                          <Chip label={`+${customVocab.length - 30} more`} size="small" />
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* ── Recent activity log ── */}
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Recent Activity
                  </Typography>
                  <Button size="small" onClick={() => navigate('/logs')}>
                    View All Logs
                  </Button>
                </Box>
                {insights.recentLogs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No activity recorded yet.
                  </Typography>
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
    </Container>
  );
}

// Small stat card component
function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ color, opacity: 0.8, display: 'flex' }}>
          {React.cloneElement(icon, { sx: { fontSize: 36 } })}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
