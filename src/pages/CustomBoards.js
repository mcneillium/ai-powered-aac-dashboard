import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue, push, set, remove, off } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { DB_PATHS, BOARD_COLORS, getUserDisplayName } from '../shared/schema';
import { toast } from 'react-hot-toast';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Chip,
  Alert, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PageSkeleton from '../components/PageSkeleton';

const EMPTY_BOARD = { name: '', color: BOARD_COLORS[0], words: [] };

export default function CustomBoards() {
  const { currentUser, isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [boardDraft, setBoardDraft] = useState(EMPTY_BOARD);
  const [wordInput, setWordInput] = useState('');
  const [boardToDelete, setBoardToDelete] = useState(null);

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
    if (!selectedUserId) { setBoards([]); return; }
    const boardsRef = ref(db, `${DB_PATHS.CUSTOM_BOARDS}/${selectedUserId}`);
    const unsubscribe = onValue(boardsRef, (snap) => {
      const data = snap.val() || {};
      setBoards(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    }, () => { setBoards([]); });
    return () => { off(boardsRef); unsubscribe(); };
  }, [selectedUserId]);

  const userNameMap = useMemo(() => {
    const map = {};
    allUsers.forEach(u => { map[u.id] = getUserDisplayName(u); });
    return map;
  }, [allUsers]);

  const handleOpenCreate = useCallback(() => {
    setEditingBoard(null);
    setBoardDraft(EMPTY_BOARD);
    setWordInput('');
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((board) => {
    setEditingBoard(board);
    setBoardDraft({ name: board.name, color: board.color, words: board.words || [] });
    setWordInput('');
    setDialogOpen(true);
  }, []);

  const handleAddWord = useCallback(() => {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    if (trimmed.includes('\n')) {
      const newWords = trimmed.split('\n').map(w => w.trim()).filter(Boolean);
      setBoardDraft(prev => ({ ...prev, words: [...prev.words, ...newWords] }));
    } else {
      setBoardDraft(prev => ({ ...prev, words: [...prev.words, trimmed] }));
    }
    setWordInput('');
  }, [wordInput]);

  const handleRemoveWord = useCallback((index) => {
    setBoardDraft(prev => ({
      ...prev,
      words: prev.words.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!boardDraft.name.trim()) {
      toast.error('Board name is required.');
      return;
    }
    if (!selectedUserId) {
      toast.error('Please select a user first.');
      return;
    }
    try {
      const now = Date.now();
      const payload = {
        name: boardDraft.name.trim(),
        color: boardDraft.color,
        words: boardDraft.words,
        updatedAt: now,
      };
      if (editingBoard) {
        await set(
          ref(db, `${DB_PATHS.CUSTOM_BOARDS}/${selectedUserId}/${editingBoard.id}`),
          { ...payload, createdAt: editingBoard.createdAt || now }
        );
        toast.success('Board updated.');
      } else {
        await push(ref(db, `${DB_PATHS.CUSTOM_BOARDS}/${selectedUserId}`), {
          ...payload,
          createdAt: now,
        });
        toast.success('Board created.');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save board.');
    }
  }, [boardDraft, selectedUserId, editingBoard]);

  const handleDelete = useCallback(async () => {
    if (!boardToDelete || !selectedUserId) return;
    try {
      await remove(ref(db, `${DB_PATHS.CUSTOM_BOARDS}/${selectedUserId}/${boardToDelete.id}`));
      toast.success('Board deleted.');
    } catch {
      toast.error('Failed to delete board.');
    }
    setDeleteDialogOpen(false);
    setBoardToDelete(null);
  }, [boardToDelete, selectedUserId]);

  if (loading) return <PageSkeleton />;

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Custom boards
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create and manage custom word boards for AAC users. Changes sync to the mobile app in real time.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 250 }} size="small">
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

        {selectedUserId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Create new board
          </Button>
        )}
      </Box>

      {!selectedUserId ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ViewModuleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">Select a user to view and manage their custom boards.</Typography>
        </Paper>
      ) : boards.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ViewModuleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary" gutterBottom>
            No custom boards yet for {userNameMap[selectedUserId] || 'this user'}.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ mt: 1 }}>
            Create first board
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {boards.map(board => (
            <Grid item xs={12} sm={6} md={4} key={board.id}>
              <Card sx={{ borderTop: `4px solid ${board.color || BOARD_COLORS[0]}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{
                      width: 16, height: 16, borderRadius: '50%',
                      bgcolor: board.color || BOARD_COLORS[0], flexShrink: 0,
                    }} />
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {board.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {(board.words || []).length} words
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(board.words || []).slice(0, 8).map((w, i) => (
                      <Chip key={i} label={w} size="small" variant="outlined" />
                    ))}
                    {(board.words || []).length > 8 && (
                      <Chip label={`+${(board.words || []).length - 8} more`} size="small" />
                    )}
                  </Box>
                  {board.createdAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Created {new Date(board.createdAt).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Tooltip title="Edit board">
                    <IconButton size="small" onClick={() => handleOpenEdit(board)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete board">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => { setBoardToDelete(board); setDeleteDialogOpen(true); }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBoard ? 'Edit board' : 'Create new board'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Board name"
            fullWidth
            value={boardDraft.name}
            onChange={(e) => setBoardDraft(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mt: 1, mb: 2 }}
          />

          <Typography variant="body2" sx={{ mb: 1 }}>Colour</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {BOARD_COLORS.map(color => (
              <Box
                key={color}
                onClick={() => setBoardDraft(prev => ({ ...prev, color }))}
                sx={{
                  width: 32, height: 32, borderRadius: '50%', bgcolor: color,
                  cursor: 'pointer', border: boardDraft.color === color ? '3px solid' : '2px solid transparent',
                  borderColor: boardDraft.color === color ? 'text.primary' : 'transparent',
                  '&:hover': { opacity: 0.8 },
                }}
              />
            ))}
          </Box>

          <Typography variant="body2" sx={{ mb: 1 }}>
            Words ({boardDraft.words.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="Add word(s)"
              size="small"
              fullWidth
              multiline
              maxRows={3}
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Type a word or paste multiple (one per line)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddWord();
                }
              }}
            />
            <Button variant="outlined" onClick={handleAddWord} sx={{ minWidth: 80 }}>
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
            {boardDraft.words.map((w, i) => (
              <Chip key={i} label={w} onDelete={() => handleRemoveWord(i)} size="small" />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!boardDraft.name.trim()}>
            {editingBoard ? 'Save changes' : 'Create board'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete board?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This will permanently delete the board "{boardToDelete?.name}" and all its words.
            This cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
