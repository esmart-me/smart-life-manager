// electron/main.cjs
// Electron Main Process for Smart Life Manager Windows Desktop Application

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let localServer = null;
const isPackaged = app.isPackaged;
const isDev = !isPackaged && process.env.NODE_ENV !== 'production';

// Persistent file logger for debugging production desktop execution
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function writeLogFile(level, ...args) {
  try {
    const line = `[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
    const userData = app.getPath('userData');
    fs.appendFileSync(path.join(userData, 'desktop.log'), line, 'utf8');
  } catch {}
}
console.log = (...args) => { origLog(...args); writeLogFile('INFO', ...args); };
console.error = (...args) => { origError(...args); writeLogFile('ERROR', ...args); };
console.warn = (...args) => { origWarn(...args); writeLogFile('WARN', ...args); };

console.log(`[Desktop] App starting. isPackaged=${isPackaged}, isDev=${isDev}, pid=${process.pid}`);

// Ensure single instance lock so multiple clicks don't spawn duplicate processes
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[Desktop] Single instance lock not acquired - another instance is active. Exiting.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  console.log('[Desktop] Second instance attempted - restoring main window.');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/**
 * Determines root directory of Next.js app
 */
function getAppRoot() {
  if (!isPackaged) {
    return path.resolve(__dirname, '..');
  }
  return path.join(process.resourcesPath, 'app');
}

/**
 * Safely loads environment variables from .env in appRoot if present
 */
function loadEnvFile(appRoot) {
  const envPath = path.join(appRoot, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
      console.log('[Desktop] Loaded environment variables from', envPath);
    } catch (e) {
      console.warn('[Desktop] Warning: Could not read .env:', e.message);
    }
  }
}

/**
 * Prepares user data directory & SQLite database path for persistent storage
 */
function setupDatabaseEnvironment(appRoot) {
  // Ensure process working directory is set to appRoot so relative path operations in Next.js resolve accurately
  try {
    process.chdir(appRoot);
    console.log('[Desktop] Working directory set to:', process.cwd());
  } catch (err) {
    console.warn('[Desktop] Warning: Could not set working directory:', err.message);
  }

  // Always load .env file if available
  loadEnvFile(appRoot);

  if (!isPackaged) {
    // In development mode, use local prisma/dev.db
    return;
  }

  try {
    const userDataPath = app.getPath('userData');
    
    // 1. Prisma SQLite Database Directory
    const userPrismaDir = path.join(userDataPath, 'prisma');
    if (!fs.existsSync(userPrismaDir)) {
      fs.mkdirSync(userPrismaDir, { recursive: true });
    }

    const userDbPath = path.join(userPrismaDir, 'dev.db');
    // If user's db doesn't exist yet or is empty, copy initial seed db from resources
    if (!fs.existsSync(userDbPath) || fs.statSync(userDbPath).size === 0) {
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

    // 2. Prisma Query Engine DLL path
    const enginePath = path.join(appRoot, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node');
    if (fs.existsSync(enginePath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
      console.log('[Desktop] Active PRISMA_QUERY_ENGINE_LIBRARY:', enginePath);
    }

    // 3. Private Storage Directory for Documents & Vault
    const userStorageDir = path.join(userDataPath, 'storage', 'private');
    if (!fs.existsSync(userStorageDir)) {
      fs.mkdirSync(userStorageDir, { recursive: true });
    }
    process.env.STORAGE_LOCAL_PATH = userStorageDir;
    console.log('[Desktop] Active STORAGE_LOCAL_PATH:', userStorageDir);
  } catch (err) {
    console.error('[Desktop] Failed to initialize user database and storage:', err);
  }
}

/**
 * Checks if a URL is currently alive and responding
 */
function checkUrlAlive(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
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
 * Starts the Next.js server in-process directly within Electron (Production Mode)
 */
async function startNextServer() {
  const appRoot = getAppRoot();
  setupDatabaseEnvironment(appRoot);
  process.env.NODE_ENV = 'production';

  const next = require('next');
  // Dedicated internal port range (32100+) for Electron production to prevent colliding with localhost:3000 (web dev server)
  const port = await getAvailablePort(32100);
  process.env.NEXT_PUBLIC_APP_URL = `http://127.0.0.1:${port}`;

  console.log(`[Desktop] Initializing Next.js from ${appRoot} on port ${port}...`);

  const nextApp = next({
    dev: false,
    dir: appRoot,
    hostname: '127.0.0.1',
    port: port,
  });

  // Ensure .next/BUILD_ID exists to prevent Next.js from throwing production-start-no-build-id
  const buildIdPath = path.join(appRoot, '.next', 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    try {
      fs.writeFileSync(buildIdPath, 'production-build-id', 'utf8');
      console.log('[Desktop] Generated fallback .next/BUILD_ID');
    } catch (e) {
      console.warn('[Desktop] Warning: Could not create fallback BUILD_ID:', e.message);
    }
  }

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

/**
 * Resolves the URL for the desktop window:
 * - In Development: Checks for running localhost dev server (http://127.0.0.1:3000)
 * - In Production: Boots the embedded in-process Next.js server
 */
async function resolveAppUrl() {
  // If DEV_SERVER_URL is explicitly set, use it
  if (process.env.DEV_SERVER_URL) {
    return process.env.DEV_SERVER_URL;
  }

  // In development, check if web dev server is running on port 3000
  if (isDev) {
    const isLocalhostLive = await checkUrlAlive('http://localhost:3000');
    const isIpv4Live = await checkUrlAlive('http://127.0.0.1:3000');
    if (isLocalhostLive || isIpv4Live) {
      const devServerUrl = isLocalhostLive ? 'http://localhost:3000' : 'http://127.0.0.1:3000';
      console.log(`[Desktop] Connected to active development server at ${devServerUrl}`);
      return devServerUrl;
    }
  }

  // Production or standalone execution: start internal server
  return startNextServer();
}

/**
 * Configures the native Windows application menu
 */
function setupApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload App',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev
          ? [
              { type: 'separator' },
              { role: 'toggleDevTools' },
            ]
          : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Smart Life Manager',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Smart Life Manager',
              message: 'Smart Life Manager Desktop',
              detail: 'Version 0.1.0\nPersonal & Family Life Operating System\nPowered by Next.js & Electron\n© 2026 Smart Life Manager',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createMainWindow(appUrl) {
  console.log(`[Desktop] Creating main window for target ${appUrl}...`);
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let targetPort = '3000';
  try {
    targetPort = new URL(appUrl).port;
  } catch {
    // fallback
  }

  function isInternalUrl(urlStr) {
    try {
      const parsed = new URL(urlStr);
      // Only filter http and compulsory schemes
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const isLoopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
      const isSamePort = String(parsed.port) === String(targetPort) || (parsed.port === '' && (targetPort === '80' || targetPort === '443'));
      return isLoopback && isSamePort;
    } catch {
      return false;
    }
  }

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

  setupApplicationMenu();

  console.log(`[Desktop] Calling mainWindow.loadURL(${appUrl})...`);
  mainWindow.loadURL(appUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    console.log(`[Desktop] Page successfully loaded: ${appUrl}`);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[Desktop] mainWindow event: ready-to-show');
    if (mainWindow) mainWindow.show();
  });

  // Safety fallback: ensure window becomes visible even if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('[Desktop] Safety fallback: showing mainWindow');
      mainWindow.show();
    }
  }, 2000);

  // Handle external navigation (e.g. Stripe checkout, documentation, external links)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url) && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isInternalUrl(url) && (url.startsWith('http://') || url.startsWith('https://'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Desktop] Page failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Desktop] Renderer process crashed:', details);
  });

  mainWindow.on('close', () => {
    console.log('[Desktop] mainWindow event: close');
  });

  mainWindow.on('closed', () => {
    console.log('[Desktop] mainWindow event: closed');
    mainWindow = null;
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Desktop UncaughtException]', err ? err.stack || err.message || err : 'unknown error');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Desktop UnhandledRejection]', reason ? reason.stack || reason.message || reason : 'unknown rejection');
});

process.on('exit', (code) => {
  console.log(`[Desktop] Process exiting with code ${code}`);
});

app.whenReady().then(async () => {
  console.log('[Desktop] app.whenReady fired');
  try {
    const appUrl = await resolveAppUrl();
    console.log(`[Desktop] resolveAppUrl resolved to: ${appUrl}`);
    createMainWindow(appUrl);
  } catch (err) {
    console.error('[Desktop Fatal]', err);
    dialog.showErrorBox(
      'Smart Life Manager Startup Error',
      `Failed to initialize application:\n\n${err.message || err}`
    );
    app.quit();
  }

  app.on('activate', () => {
    console.log('[Desktop] app event: activate');
    if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
      resolveAppUrl().then((url) => createMainWindow(url));
    }
  });
});

function cleanupServer() {
  if (localServer) {
    try {
      console.log('[Desktop] Closing internal HTTP server');
      localServer.close();
      localServer = null;
    } catch {
      // Ignored
    }
  }
}

app.on('before-quit', () => {
  console.log('[Desktop] app event: before-quit');
  cleanupServer();
});

app.on('will-quit', () => {
  console.log('[Desktop] app event: will-quit');
  cleanupServer();
});

app.on('quit', (e, exitCode) => {
  console.log(`[Desktop] app event: quit with exitCode ${exitCode}`);
});

app.on('window-all-closed', () => {
  console.log('[Desktop] app event: window-all-closed');
  cleanupServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
