import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
const { ipcRenderer } = window.require('electron');

function ConnectionManager({ open, onClose, onConnect }) {
  const [connections, setConnections] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [currentConnection, setCurrentConnection] = useState({
    name: '',
    host: 'localhost',
    port: '6379',
    password: '',
    username: ''
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const savedConnections = await ipcRenderer.invoke('get-connections');
    setConnections(savedConnections);
  };

  const handleSave = async () => {
    if (!currentConnection.name || !currentConnection.host || !currentConnection.port) {
      return;
    }

    await ipcRenderer.invoke('save-connection', currentConnection);
    setCurrentConnection({
      name: '',
      host: 'localhost',
      port: '6379',
      password: '',
      username: ''
    });
    setEditMode(false);
    loadConnections();
  };

  const handleEdit = (connection) => {
    setCurrentConnection(connection);
    setEditMode(true);
  };

  const handleDelete = async (name) => {
    await ipcRenderer.invoke('delete-connection', name);
    loadConnections();
  };

  const handleConnect = async (connection) => {
    const result = await ipcRenderer.invoke('connect-redis', connection);
    if (result.success) {
      onConnect(connection);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Redis Connections</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {editMode ? 'Edit Connection' : 'New Connection'}
          </Typography>
          <TextField
            fullWidth
            label="Connection Name"
            value={currentConnection.name}
            onChange={(e) => setCurrentConnection({ ...currentConnection, name: e.target.value })}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Host"
            value={currentConnection.host}
            onChange={(e) => setCurrentConnection({ ...currentConnection, host: e.target.value })}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Port"
            value={currentConnection.port}
            onChange={(e) => setCurrentConnection({ ...currentConnection, port: e.target.value })}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Username (optional)"
            value={currentConnection.username}
            onChange={(e) => setCurrentConnection({ ...currentConnection, username: e.target.value })}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Password (optional)"
            type="password"
            value={currentConnection.password}
            onChange={(e) => setCurrentConnection({ ...currentConnection, password: e.target.value })}
            margin="dense"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            startIcon={<AddIcon />}
            sx={{ mt: 1 }}
          >
            {editMode ? 'Update' : 'Add'} Connection
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Saved Connections
        </Typography>
        <List>
          {connections.map((conn) => (
            <ListItem key={conn.name}>
              <ListItemText
                primary={conn.name}
                secondary={`${conn.host}:${conn.port}`}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleEdit(conn)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => handleDelete(conn.name)}>
                  <DeleteIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleConnect(conn)}
                  sx={{ ml: 1 }}
                >
                  Connect
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConnectionManager;
