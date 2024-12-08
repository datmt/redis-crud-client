import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Link
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import MoreIcon from '@mui/icons-material/MoreHoriz';
import ConnectionManager from './components/ConnectionManager';
const { ipcRenderer } = window.require('electron');

function App() {
  const [keys, setKeys] = useState([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(true);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [isReversedLayout, setIsReversedLayout] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, key: null });
  const [searchPattern, setSearchPattern] = useState('*');
  const [cursor, setCursor] = useState('0');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentConnection) {
      loadKeys(true);
    }
  }, [currentConnection]);

  const loadKeys = async (newSearch = false) => {
    try {
      setLoading(true);
      if (newSearch) {
        setCursor('0');
        setKeys([]);
      }

      const currentCursor = newSearch ? '0' : cursor;
      const result = await ipcRenderer.invoke('redis-scan', {
        cursor: currentCursor,
        pattern: searchPattern,
        count: 50
      });

      if (result.success) {
        const { cursor: newCursor, keys: newKeys, hasMore: more } = result.data;
        setKeys(prevKeys => newSearch ? newKeys : [...prevKeys, ...newKeys]);
        setCursor(newCursor);
        setHasMore(more);
      } else {
        setNotification({ open: true, message: result.error, severity: 'error' });
      }
    } catch (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    loadKeys(true);
  };

  const handleEdit = async (keyToEdit) => {
    try {
      const result = await ipcRenderer.invoke('redis-get', keyToEdit);
      if (result.success) {
        setKey(keyToEdit);
        setValue(result.data || '');
        setEditMode(true);
      } else {
        setNotification({ open: true, message: result.error, severity: 'error' });
      }
    } catch (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = (keyToDelete) => {
    setDeleteDialog({ open: true, key: keyToDelete });
  };

  const confirmDelete = async () => {
    try {
      const result = await ipcRenderer.invoke('redis-delete', deleteDialog.key);
      if (result.success) {
        setKeys(prevKeys => prevKeys.filter(k => k !== deleteDialog.key));
        setNotification({ open: true, message: 'Key deleted successfully', severity: 'success' });
      } else {
        setNotification({ open: true, message: result.error, severity: 'error' });
      }
    } catch (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, key: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!key || !value) {
        setNotification({ open: true, message: 'Both key and value are required', severity: 'error' });
        return;
      }

      const result = await ipcRenderer.invoke('redis-set', { key, value });
      if (result.success) {
        if (!editMode && !keys.includes(key)) {
          setKeys(prevKeys => [...prevKeys, key]);
        }
        setNotification({ 
          open: true, 
          message: `Key ${editMode ? 'updated' : 'created'} successfully`, 
          severity: 'success' 
        });
        if (editMode) {
          setEditMode(false);
        }
        setKey('');
        setValue('');
      } else {
        setNotification({ open: true, message: result.error, severity: 'error' });
      }
    } catch (error) {
      setNotification({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleConnectionSuccess = async (connection) => {
    setCurrentConnection(connection);
    setConnectionDialogOpen(false);
    setNotification({ 
      open: true, 
      message: `Connected to Redis at ${connection.host}:${connection.port}`, 
      severity: 'success' 
    });
  };

  const toggleLayout = () => {
    setIsReversedLayout(!isReversedLayout);
  };

  if (!currentConnection) {
    return (
      <ConnectionManager
        open={connectionDialogOpen}
        onClose={() => setConnectionDialogOpen(false)}
        onConnect={handleConnectionSuccess}
      />
    );
  }

  return (
    <Container>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Redis Client - {currentConnection.name} ({currentConnection.host}:{currentConnection.port})
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => setConnectionDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Manage Connections
          </Button>
          <Tooltip title="Toggle Layout">
            <IconButton color="inherit" onClick={toggleLayout}>
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2} direction={isReversedLayout ? 'row-reverse' : 'row'}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Search Keys"
                  value={searchPattern}
                  onChange={(e) => setSearchPattern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadKeys(true)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => loadKeys(true)}>
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              
              <List>
                {keys.map((k) => (
                  <ListItem key={k}>
                    <ListItemText primary={k} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleEdit(k)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDelete(k)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress />
                </Box>
              ) : hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => loadKeys(false)}
                    startIcon={<MoreIcon />}
                  >
                    Load More
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {editMode ? 'Edit Key' : 'Create New Key'}
              </Typography>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={editMode}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  margin="normal"
                  multiline
                  rows={4}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                  >
                    {editMode ? 'Update' : 'Create'}
                  </Button>
                  {editMode && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false);
                        setKey('');
                        setValue('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box 
        component="footer" 
        sx={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Created by{' '}
          <Link
            href="https://datmt.com"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            underline="hover"
          >
            datmt.com
          </Link>
        </Typography>
      </Box>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, key: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete key <strong>{deleteDialog.key}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, key: null })}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <ConnectionManager
        open={connectionDialogOpen}
        onClose={() => setConnectionDialogOpen(false)}
        onConnect={handleConnectionSuccess}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
