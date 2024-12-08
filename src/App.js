import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
  Tooltip,
  Chip,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MoreIcon from '@mui/icons-material/MoreVert';
import ClearIcon from '@mui/icons-material/Clear';
import ConnectionManager from './components/ConnectionManager';
const { ipcRenderer } = window.require('electron');

function App() {
  const [keys, setKeys] = useState([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('string');
  const [ttlType, setTtlType] = useState('none');
  const [ttlValue, setTtlValue] = useState('');
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
  const [totalKeys, setTotalKeys] = useState(0);
  const [keyDetails, setKeyDetails] = useState({});
  const KEYS_PER_PAGE = 10;

  useEffect(() => {
    if (currentConnection) {
      loadKeys(true);
    }
  }, [currentConnection]);

  const loadKeys = async (newSearch = false) => {
    try {
      setLoading(true);
      const result = await ipcRenderer.invoke('redis-keys', {
        pattern: searchPattern || '*',
        cursor: newSearch ? '0' : cursor,
        count: KEYS_PER_PAGE
      });

      if (result.success) {
        const { keys: newKeys, cursor: newCursor, totalKeys: total, hasMore: more } = result.data;
        setKeys(prevKeys => newSearch ? newKeys : [...prevKeys, ...newKeys]);
        setCursor(newCursor);
        setHasMore(more);
        setTotalKeys(total);

        // Load details for new keys
        newKeys.forEach(loadKeyDetails);
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

  const handleEdit = async (selectedKey) => {
    try {
      const result = await ipcRenderer.invoke('redis-get-details', selectedKey);
      if (result.success) {
        setKey(selectedKey);
        setValue(result.data.value);
        setType(result.data.type);
        
        // Handle TTL
        const ttl = result.data.ttl;
        if (ttl === -1) {
          setTtlType('none');
          setTtlValue('');
        } else {
          if (ttl >= 86400) {
            setTtlType('days');
            setTtlValue(Math.floor(ttl / 86400));
          } else if (ttl >= 3600) {
            setTtlType('hours');
            setTtlValue(Math.floor(ttl / 3600));
          } else if (ttl >= 60) {
            setTtlType('minutes');
            setTtlValue(Math.floor(ttl / 60));
          } else {
            setTtlType('seconds');
            setTtlValue(ttl);
          }
        }
        
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

  const loadKeyDetails = async (key) => {
    try {
      const details = await ipcRenderer.invoke('redis-get-details', key);
      if (details.success) {
        setKeyDetails(prev => ({
          ...prev,
          [key]: details.data
        }));
      }
    } catch (error) {
      console.error(`Error loading details for key ${key}:`, error);
    }
  };

  useEffect(() => {
    if (!currentConnection) return;
    
    const interval = setInterval(() => {
      keys.forEach(loadKeyDetails);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [currentConnection, keys]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!key) {
        setNotification({ open: true, message: 'Key is required', severity: 'error' });
        return;
      }

      // Calculate TTL in seconds
      let ttl = -1;
      if (ttlType !== 'none' && ttlValue) {
        switch (ttlType) {
          case 'days':
            ttl = parseInt(ttlValue) * 86400;
            break;
          case 'hours':
            ttl = parseInt(ttlValue) * 3600;
            break;
          case 'minutes':
            ttl = parseInt(ttlValue) * 60;
            break;
          case 'seconds':
            ttl = parseInt(ttlValue);
            break;
        }
      }

      const result = await ipcRenderer.invoke('redis-set', { key, value, type, ttl });
      if (result.success) {
        if (!editMode && !keys.includes(key)) {
          setKeys(prevKeys => [...prevKeys, key]);
        }
        setNotification({
          open: true,
          message: `Key ${editMode ? 'updated' : 'created'} successfully`,
          severity: 'success'
        });
        // Load details for the new/updated key
        await loadKeyDetails(key);
        
        setEditMode(false);
        setKey('');
        setValue('');
        setType('string');
        setTtlType('none');
        setTtlValue('');
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

  // Helper function to format TTL
  const formatTTL = (ttl) => {
    if (ttl === -1) return null;
    if (ttl >= 86400) return `${Math.floor(ttl / 86400)}d`;
    if (ttl >= 3600) return `${Math.floor(ttl / 3600)}h`;
    if (ttl >= 60) return `${Math.floor(ttl / 60)}m`;
    return `${ttl}s`;
  };

  // Helper function to get type color
  const getTypeColor = (type) => {
    switch (type) {
      case 'string': return 'primary';
      case 'list': return 'success';
      case 'set': return 'info';
      case 'zset': return 'warning';
      case 'hash': return 'secondary';
      default: return 'default';
    }
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
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Keys</Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing {keys.length} of {totalKeys} keys
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Search Keys"
                  value={searchPattern}
                  onChange={(e) => setSearchPattern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadKeys(true)}
                  placeholder="Use * as wildcard (e.g., user:*, *name)"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Search">
                          <IconButton 
                            onClick={() => loadKeys(true)}
                            disabled={loading}
                          >
                            <SearchIcon />
                          </IconButton>
                        </Tooltip>
                        {searchPattern && (
                          <Tooltip title="Clear search">
                            <IconButton
                              onClick={() => {
                                setSearchPattern('');
                                loadKeys(true);
                              }}
                              disabled={loading}
                            >
                              <ClearIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              
              <List>
                {keys.map((k) => (
                  <ListItem
                    key={k}
                    sx={{
                      borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{k}</Typography>
                          {keyDetails[k] && (
                            <Stack direction="row" spacing={1}>
                              <Chip
                                label={keyDetails[k].type}
                                size="small"
                                color={getTypeColor(keyDetails[k].type)}
                              />
                              {keyDetails[k].ttl > 0 && (
                                <Chip
                                  label={formatTTL(keyDetails[k].ttl)}
                                  size="small"
                                  variant="outlined"
                                  color="default"
                                />
                              )}
                              <Chip
                                label={`${Math.round(keyDetails[k].memory / 1024)}KB`}
                                size="small"
                                variant="outlined"
                                color="default"
                              />
                            </Stack>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEdit(k)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDelete(k)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => loadKeys(false)}
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={20} />}
                  >
                    {loading ? 'Loading...' : 'Load More'}
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

                <FormControl fullWidth margin="normal">
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={editMode}
                  >
                    <MenuItem value="string">String</MenuItem>
                    <MenuItem value="list">List</MenuItem>
                    <MenuItem value="set">Set</MenuItem>
                    <MenuItem value="zset">Sorted Set</MenuItem>
                    <MenuItem value="hash">Hash</MenuItem>
                  </Select>
                </FormControl>

                {type === 'string' && (
                  <TextField
                    fullWidth
                    label="Value"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => setValue(e.target.value)}
                    margin="normal"
                    multiline
                    rows={4}
                  />
                )}

                {type === 'list' && (
                  <Box sx={{ mt: 2 }}>
                    {Array.isArray(value) ? value.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          label={`Item ${index + 1}`}
                          value={item}
                          onChange={(e) => {
                            const newValue = [...value];
                            newValue[index] = e.target.value;
                            setValue(newValue);
                          }}
                        />
                        <IconButton onClick={() => {
                          setValue(value.filter((_, i) => i !== index));
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )) : null}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setValue([...(Array.isArray(value) ? value : []), ''])}
                    >
                      Add Item
                    </Button>
                  </Box>
                )}

                {type === 'set' && (
                  <Box sx={{ mt: 2 }}>
                    {Array.isArray(value) ? value.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          label={`Member ${index + 1}`}
                          value={item}
                          onChange={(e) => {
                            const newValue = [...value];
                            newValue[index] = e.target.value;
                            setValue(newValue);
                          }}
                        />
                        <IconButton onClick={() => {
                          setValue(value.filter((_, i) => i !== index));
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )) : null}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setValue([...(Array.isArray(value) ? value : []), ''])}
                    >
                      Add Member
                    </Button>
                  </Box>
                )}

                {type === 'zset' && (
                  <Box sx={{ mt: 2 }}>
                    {Array.isArray(value) ? value.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          sx={{ flexGrow: 1 }}
                          label={`Member ${index + 1}`}
                          value={item.member}
                          onChange={(e) => {
                            const newValue = [...value];
                            newValue[index] = { ...item, member: e.target.value };
                            setValue(newValue);
                          }}
                        />
                        <TextField
                          sx={{ width: 120 }}
                          label="Score"
                          type="number"
                          value={item.score}
                          onChange={(e) => {
                            const newValue = [...value];
                            newValue[index] = { ...item, score: e.target.value };
                            setValue(newValue);
                          }}
                        />
                        <IconButton onClick={() => {
                          setValue(value.filter((_, i) => i !== index));
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )) : null}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setValue([...(Array.isArray(value) ? value : []), { member: '', score: 0 }])}
                    >
                      Add Member
                    </Button>
                  </Box>
                )}

                {type === 'hash' && (
                  <Box sx={{ mt: 2 }}>
                    {value && typeof value === 'object' ? Object.entries(value).map(([field, val], index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          sx={{ flexGrow: 1 }}
                          label="Field"
                          value={field}
                          onChange={(e) => {
                            const newValue = { ...value };
                            delete newValue[field];
                            newValue[e.target.value] = val;
                            setValue(newValue);
                          }}
                        />
                        <TextField
                          sx={{ flexGrow: 1 }}
                          label="Value"
                          value={val}
                          onChange={(e) => {
                            setValue({
                              ...value,
                              [field]: e.target.value
                            });
                          }}
                        />
                        <IconButton onClick={() => {
                          const newValue = { ...value };
                          delete newValue[field];
                          setValue(newValue);
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )) : null}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setValue({ ...value, '': '' })}
                    >
                      Add Field
                    </Button>
                  </Box>
                )}

                <FormControl fullWidth margin="normal">
                  <InputLabel>TTL</InputLabel>
                  <Select
                    value={ttlType}
                    onChange={(e) => setTtlType(e.target.value)}
                  >
                    <MenuItem value="none">No Expiration</MenuItem>
                    <MenuItem value="seconds">Seconds</MenuItem>
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="hours">Hours</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>

                {ttlType !== 'none' && (
                  <TextField
                    fullWidth
                    label={`Time to live (in ${ttlType})`}
                    type="number"
                    value={ttlValue}
                    onChange={(e) => setTtlValue(e.target.value)}
                    margin="normal"
                  />
                )}

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
                        setType('string');
                        setTtlType('none');
                        setTtlValue('');
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
