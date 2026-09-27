// electron/main.cjs
// Electron Main Process for Smart Life Manager Windows Desktop Application

const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Ensure single instance lock so multiple clicks don't spawn duplicate processes
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/**
 * Checks if a specific port is already listening and responsive
 */
function isPortListening(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Finds an available port starting from basePort
 */
function getAvailablePort(basePort) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(basePort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(getAvailablePort(basePort + 1));
    });
  });
}

/**
 * Spawns the local Next.js background server
 */
async function launchLocalServer() {
  // If in dev and dev server is already running on 3000, reuse it
  if (isDev) {
    const active = await isPortListening(3000);
    if (active) {
      console.log('[Desktop] Existing dev server detected on port 3000.');
      return 'http://127.0.0.1:3000';
    }
  }

  // Otherwise pick an open port and spawn the server worker
  const port = await getAvailablePort(3000);
  console.log(`[Desktop] Starting background server on port ${port}...`);

  return new Promise((resolve, reject) => {
    const serverScript = path.join(__dirname, 'server.cjs');

    serverProcess = fork(serverScript, [String(port)], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: isDev ? 'development' : 'production',
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    serverProcess.stdout.on('data', (d) => process.stdout.write(`[Server] ${d}`));
    serverProcess.stderr.on('data', (d) => process.stderr.write(`[Server ERR] ${d}`));

    const timeout = setTimeout(() => {
      reject(new Error('Server boot timed out after 30 seconds.'));
    }, 30000);

    serverProcess.on('message', (msg) => {
      if (msg && msg.type === 'ready') {
        clearTimeout(timeout);
        resolve(msg.url);
      } else if (msg && (msg.type === 'error' || msg.type === 'fatal')) {
        clearTimeout(timeout);
        reject(new Error(msg.error || 'Server failed to start'));
      }
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

function createMainWindow(appUrl) {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    center: true,
    show: false, // Show once ready-to-show to prevent white flash
    backgroundColor: '#090d16',
    title: 'Smart Life Manager',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: isDev,
    },
  });

  // Load local Next.js application
  mainWindow.loadURL(appUrl);

  // Smooth reveal when DOM is painted
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Handle external navigation (e.g. Stripe checkout, external documentation)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If navigation is external to localhost, launch in default web browser
    if (!url.startsWith(appUrl) && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(appUrl) && (url.startsWith('http://') || url.startsWith('https://'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    const appUrl = await launchLocalServer();
    createMainWindow(appUrl);
  } catch (err) {
    console.error('[Desktop Fatal]', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
      // Re-create window on macOS or if reopened
      createMainWindow('http://127.0.0.1:3000');
    }
  });
});

// Clean up background server on application termination
function cleanupServer() {
  if (serverProcess) {
    try {
      serverProcess.send('shutdown');
      setTimeout(() => {
        if (serverProcess) serverProcess.kill('SIGKILL');
      }, 2000);
    } catch {
      // Process already terminated
    }
  }
}

app.on('before-quit', cleanupServer);
app.on('will-quit', cleanupServer);

app.on('window-all-closed', () => {
  cleanupServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
