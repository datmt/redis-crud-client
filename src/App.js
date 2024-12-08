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
  DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
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

  const loadKeys = async () => {
    const result = await ipcRenderer.invoke('redis-keys');
    if (result.success) {
      setKeys(result.data);
    } else {
      setNotification({ open: true, message: result.error, severity: 'error' });
    }
  };

  useEffect(() => {
    if (currentConnection) {
      loadKeys();
    }
  }, [currentConnection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key || !value) return;

    const result = await ipcRenderer.invoke('redis-set', { key, value });
    if (result.success) {
      setNotification({ open: true, message: 'Value saved successfully!', severity: 'success' });
      setKey('');
      setValue('');
      loadKeys();
    } else {
      setNotification({ open: true, message: result.error, severity: 'error' });
    }
  };

  const handleDelete = async (keyToDelete) => {
    setDeleteDialog({ open: true, key: keyToDelete });
  };

  const confirmDelete = async () => {
    const keyToDelete = deleteDialog.key;
    setDeleteDialog({ open: false, key: null });
    
    const result = await ipcRenderer.invoke('redis-delete', keyToDelete);
    if (result.success) {
      setNotification({ open: true, message: 'Key deleted successfully!', severity: 'success' });
      loadKeys();
    } else {
      setNotification({ open: true, message: result.error, severity: 'error' });
    }
  };

  const handleEdit = async (key) => {
    const result = await ipcRenderer.invoke('redis-get', key);
    if (result.success) {
      setKey(key);
      setValue(result.data);
      setEditMode(true);
    } else {
      setNotification({ open: true, message: result.error, severity: 'error' });
    }
  };

  const handleConnectionSuccess = (connection) => {
    setCurrentConnection(connection);
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
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Redis CRUD Client
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Connected to: {currentConnection.name}
          </Typography>
          <Tooltip title="Switch Layout">
            <IconButton 
              color="inherit" 
              onClick={toggleLayout}
              sx={{ mr: 2 }}
            >
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>
          <Button 
            color="inherit" 
            onClick={() => setConnectionDialogOpen(true)}
          >
            Manage Connections
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7} order={{ xs: 1, md: isReversedLayout ? 2 : 1 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Redis Keys
              </Typography>
              <List>
                {keys.map((keyItem) => (
                  <ListItem key={keyItem}>
                    <ListItemText 
                      primary={keyItem} 
                      sx={{
                        wordBreak: 'break-all'
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleEdit(keyItem)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(keyItem)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5} order={{ xs: 2, md: isReversedLayout ? 1 : 2 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {editMode ? 'Edit Key' : 'Create New Key'}
              </Typography>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
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
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  {editMode ? 'Update' : 'Save'}
                </Button>
                {editMode && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    sx={{ mt: 2, ml: 2 }}
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
            </Paper>
          </Grid>
        </Grid>

        <ConnectionManager
          open={connectionDialogOpen}
          onClose={() => setConnectionDialogOpen(false)}
          onConnect={handleConnectionSuccess}
        />

        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, key: null })}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the key <Box component="span" sx={{ fontWeight: 'bold' }}>{deleteDialog.key}</Box>?
              <br />
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, key: null })}
              color="inherit"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              color="error"
              variant="contained"
              autoFocus
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          <Alert severity={notification.severity}>
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}

export default App;
