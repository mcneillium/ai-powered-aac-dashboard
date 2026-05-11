import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { DB_PATHS, getUserDisplayName } from '../shared/schema';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Chip,
  List, ListItem, ListItemText, Badge,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import PageSkeleton from '../components/PageSkeleton';

export default function Favorites() {
  const { currentUser, isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      if (isAdmin) {
        setAllUsers(list.filter(u => !u.role || u.role === 'user'));
      } else {
        setAllUsers(list.filter(u => u.caregiverId === currentUser.uid));
      }
      setLoading(false);
    }, () => { setLoading(false); });
    return () => { off(usersRef); unsubscribe(); };
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!selectedUserId) { setFavorites([]); return; }
    const favRef = ref(db, `${DB_PATHS.FAVORITES}/${selectedUserId}`);
    const unsubscribe = onValue(favRef, (snap) => {
      const data = snap.val() || {};
      setFavorites(
        Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      );
    }, () => { setFavorites([]); });
    return () => { off(favRef); unsubscribe(); };
  }, [selectedUserId]);

  const stats = useMemo(() => {
    const total = favorites.length;
    const mostUsed = favorites.length > 0 ? favorites[0] : null;
    const categories = {};
    favorites.forEach(f => {
      const cat = f.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return { total, mostUsed, categories };
  }, [favorites]);

  if (loading) return <PageSkeleton />;

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Favorites
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View favourite sentences saved by AAC users from the mobile app.
      </Typography>

      <FormControl sx={{ minWidth: 250, mb: 3 }} size="small">
        <InputLabel>Select user</InputLabel>
        <Select
          value={selectedUserId}
          label="Select user"
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <MenuItem value="">-- Choose a user --</MenuItem>
          {allUsers.map(u => (
            <MenuItem key={u.id} value={u.id}>
              {getUserDisplayName(u)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!selectedUserId ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <StarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">Select a user to view their favourite sentences.</Typography>
        </Paper>
      ) : favorites.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <StarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">No favourites saved yet for this user.</Typography>
        </Paper>
      ) : (
        <>
          {/* Summary stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Total favourites</Typography>
                  <Typography variant="h4" fontWeight={600}>{stats.total}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Most used</Typography>
                  <Typography variant="h6" fontWeight={600} noWrap>
                    {stats.mostUsed?.sentence || '-'}
                  </Typography>
                  {stats.mostUsed && (
                    <Typography variant="caption" color="text.secondary">
                      {stats.mostUsed.usageCount || 0} uses
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Categories</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {Object.entries(stats.categories).map(([cat, count]) => (
                      <Chip
                        key={cat}
                        label={`${cat}: ${count}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Favorites list */}
          <Paper>
            <List disablePadding>
              {favorites.map((fav, idx) => (
                <ListItem
                  key={fav.id}
                  divider={idx < favorites.length - 1}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {fav.category && (
                        <Chip label={fav.category} size="small" variant="outlined" />
                      )}
                      <Badge
                        badgeContent={fav.usageCount || 0}
                        color="primary"
                        max={999}
                      >
                        <StarIcon sx={{ color: 'warning.main' }} />
                      </Badge>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={fav.sentence}
                    secondary={
                      fav.lastUsed
                        ? `Last used: ${new Date(fav.lastUsed).toLocaleDateString()}`
                        : null
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}
    </Box>
  );
}
