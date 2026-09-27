// electron/main.cjs
// Electron Main Process for Smart Life Manager Windows Desktop Application

const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let localServer = null;
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
 * Determines root directory of Next.js app
 */
function getAppRoot() {
  if (!app.isPackaged) {
    return path.resolve(__dirname, '..');
  }
  return path.join(process.resourcesPath, 'app');
}

/**
 * Prepares user data directory & SQLite database path for persistent storage
 */
function setupDatabaseEnvironment(appRoot) {
  if (!app.isPackaged) {
    // In development mode, use local prisma/dev.db
    return;
  }

  try {
    const userDataPath = app.getPath('userData');
    const userPrismaDir = path.join(userDataPath, 'prisma');
    if (!fs.existsSync(userPrismaDir)) {
      fs.mkdirSync(userPrismaDir, { recursive: true });
    }

    const userDbPath = path.join(userPrismaDir, 'dev.db');
    // If user's db doesn't exist yet, copy initial seed db from resources
    if (!fs.existsSync(userDbPath)) {
      const templateDb = path.join(process.resourcesPath, 'prisma', 'dev.db');
      if (fs.existsSync(templateDb)) {
        fs.copyFileSync(templateDb, userDbPath);
        console.log('[Desktop] Copied initial database to user AppData:', userDbPath);
      }
    }

    // Set DATABASE_URL to user's AppData location
    const normalizedDbUri = 'file:' + userDbPath.replace(/\\/g, '/');
    process.env.DATABASE_URL = normalizedDbUri;
    console.log('[Desktop] Active DATABASE_URL:', normalizedDbUri);
  } catch (err) {
    console.error('[Desktop] Failed to initialize user database:', err);
  }
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
 * Starts the Next.js server in-process directly within Electron
 */
async function startNextServer() {
  const appRoot = getAppRoot();
  setupDatabaseEnvironment(appRoot);

  const next = require('next');
  const port = await getAvailablePort(3000);

  console.log(`[Desktop] Initializing Next.js from ${appRoot} on port ${port}...`);

  const nextApp = next({
    dev: false,
    dir: appRoot,
    hostname: '127.0.0.1',
    port: port,
  });

  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  localServer = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve, reject) => {
    localServer.listen(port, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const appUrl = `http://127.0.0.1:${port}`;
  console.log(`[Desktop] Next.js server successfully running at ${appUrl}`);
  return appUrl;
}

function createMainWindow(appUrl) {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    center: true,
    show: false,
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

  mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external navigation (e.g. Stripe checkout, documentation)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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

app.whenReady().then(async () => {
  try {
    const appUrl = await startNextServer();
    createMainWindow(appUrl);
  } catch (err) {
    console.error('[Desktop Fatal]', err);
    dialog.showErrorBox(
      'Smart Life Manager Startup Error',
      `Failed to initialize local application engine:\n\n${err.message || err}`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
      createMainWindow('http://127.0.0.1:3000');
    }
  });
});

function cleanupServer() {
  if (localServer) {
    try {
      localServer.close();
      localServer = null;
    } catch {
      // Ignored
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
