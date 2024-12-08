const { app, BrowserWindow, ipcMain } = require('electron');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let redis = null;
const connectionsFile = path.join(app.getPath('userData'), 'connections.json');
const KEYS_PER_PAGE = 50;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL(
    isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, 'build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Connection management
function loadConnections() {
  try {
    if (fs.existsSync(connectionsFile)) {
      const data = fs.readFileSync(connectionsFile, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading connections:', error);
    return [];
  }
}

function saveConnections(connections) {
  try {
    fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));
  } catch (error) {
    console.error('Error saving connections:', error);
  }
}

ipcMain.handle('get-connections', () => {
  return loadConnections();
});

ipcMain.handle('save-connection', (event, connection) => {
  const connections = loadConnections();
  const existingIndex = connections.findIndex(conn => conn.name === connection.name);
  
  if (existingIndex >= 0) {
    connections[existingIndex] = connection;
  } else {
    connections.push(connection);
  }
  
  saveConnections(connections);
  return { success: true };
});

ipcMain.handle('delete-connection', (event, name) => {
  const connections = loadConnections();
  const filteredConnections = connections.filter(conn => conn.name !== name);
  saveConnections(filteredConnections);
  return { success: true };
});

ipcMain.handle('connect-redis', async (event, connection) => {
  try {
    if (redis) {
      await redis.quit();
    }

    redis = new Redis({
      host: connection.host,
      port: connection.port,
      username: connection.username || undefined,
      password: connection.password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Redis connection error:', error);
    return { success: false, error: error.message };
  }
});

// Redis CRUD operations
ipcMain.handle('redis-scan', async (event, { cursor = '0', pattern = '*', count = KEYS_PER_PAGE }) => {
  try {
    if (!redis) throw new Error('Not connected to Redis');
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    return { 
      success: true, 
      data: {
        cursor: newCursor,
        keys,
        hasMore: newCursor !== '0'
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-get', async (event, key) => {
  try {
    if (!redis) throw new Error('Not connected to Redis');
    const value = await redis.get(key);
    return { success: true, data: value };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-get-details', async (event, key) => {
  try {
    if (!redis) throw new Error('Not connected to Redis');
    
    // Get value and type
    const type = await redis.type(key);
    let value;
    let members;
    let fields;
    
    switch(type) {
      case 'string':
        value = await redis.get(key);
        break;
      case 'list':
        value = await redis.lrange(key, 0, -1);
        break;
      case 'set':
        value = await redis.smembers(key);
        break;
      case 'zset':
        members = await redis.zrange(key, 0, -1, 'WITHSCORES');
        value = [];
        for (let i = 0; i < members.length; i += 2) {
          value.push({ member: members[i], score: parseFloat(members[i + 1]) });
        }
        break;
      case 'hash':
        fields = await redis.hgetall(key);
        value = fields;
        break;
      default:
        value = null;
    }

    // Get TTL
    const ttl = await redis.ttl(key);
    
    // Get memory usage
    const memory = await redis.memory('USAGE', key);

    return { 
      success: true, 
      data: {
        type,
        value,
        ttl,
        memory
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-set', async (event, { key, value, type, ttl }) => {
  try {
    if (!redis) throw new Error('Not connected to Redis');

    // Set value based on type
    switch(type) {
      case 'string':
        await redis.set(key, value);
        break;
      case 'list':
        await redis.del(key); // Clear existing list
        if (Array.isArray(value) && value.length > 0) {
          await redis.rpush(key, ...value);
        }
        break;
      case 'set':
        await redis.del(key); // Clear existing set
        if (Array.isArray(value) && value.length > 0) {
          await redis.sadd(key, ...value);
        }
        break;
      case 'zset':
        await redis.del(key); // Clear existing sorted set
        if (Array.isArray(value)) {
          for (const item of value) {
            await redis.zadd(key, item.score, item.member);
          }
        }
        break;
      case 'hash':
        await redis.del(key); // Clear existing hash
        if (typeof value === 'object' && value !== null) {
          await redis.hmset(key, value);
        }
        break;
      default:
        throw new Error('Unsupported Redis data type');
    }

    // Set TTL if specified
    if (ttl && ttl > 0) {
      await redis.expire(key, ttl);
    } else if (ttl === -1) {
      await redis.persist(key); // Remove TTL
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-delete', async (event, key) => {
  try {
    if (!redis) throw new Error('Not connected to Redis');
    await redis.del(key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-search', async (event, pattern) => {
  try {
    if (!redis) throw new Error('Not connected to Redis');
    const keys = [];
    let cursor = '0';
    
    do {
      const [newCursor, scanKeys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        KEYS_PER_PAGE
      );
      cursor = newCursor;
      keys.push(...scanKeys);
      
      // Limit total results to prevent memory issues
      if (keys.length > 1000) {
        break;
      }
    } while (cursor !== '0');

    return { success: true, data: keys };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-connect', async (event, { host, port, password }) => {
  try {
    redis = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    await redis.ping();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis-disconnect', async () => {
  try {
    if (redis) {
      await redis.quit();
      redis = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
