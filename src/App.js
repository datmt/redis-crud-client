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
  Toolbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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

  const handleDelete = async (key) => {
    const result = await ipcRenderer.invoke('redis-delete', key);
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
          <Button 
            color="inherit" 
            onClick={() => setConnectionDialogOpen(true)}
          >
            Manage Connections
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
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
          </Box>

          <List>
            {keys.map((key) => (
              <ListItem key={key}>
                <ListItemText primary={key} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleEdit(key)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(key)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>

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
          <Alert severity={notification.severity}>
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}

export default App;
