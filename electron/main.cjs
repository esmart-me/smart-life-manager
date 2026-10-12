// electron/main.cjs
// Electron Main Process for Smart Life Manager Windows Desktop Application

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, safeStorage, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

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
 * Loads persistent environment variable overrides from %APPDATA%\smart-life-manager\.env if present
 */
function loadUserDataEnvFile(userDataPath) {
  const userEnvPath = path.join(userDataPath, '.env');
  if (fs.existsSync(userEnvPath)) {
    try {
      const content = fs.readFileSync(userEnvPath, 'utf8');
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
          process.env[key] = val;
        }
      });
      console.log('[Desktop] Loaded persistent user configuration from', userEnvPath);
    } catch (e) {
      console.warn('[Desktop] Warning: Could not read AppData .env:', e.message);
    }
  }
}

/**
 * Ensures a persistent, per-machine cryptographically secure JWT_SECRET in userData.
 * Prevents packaging developer secrets while ensuring JWT sessions survive restarts.
 * Generated secret is strictly kept in OS AppData and never exposed to renderer or IPC.
 */
function setupPerMachineSecret(userDataPath) {
  try {
    const secretFilePath = path.join(userDataPath, '.desktop-secret');
    let secret = null;

    if (fs.existsSync(secretFilePath)) {
      try {
        const stored = fs.readFileSync(secretFilePath, 'utf8').trim();
        if (stored && stored.length >= 32) {
          secret = stored;
          console.log('[Desktop] Loaded persistent per-machine JWT_SECRET from userData storage.');
        }
      } catch (readErr) {
        console.warn('[Desktop] Warning: Could not read persistent secret:', readErr.message);
      }
    }

    if (!secret) {
      // Generate 32-byte (64 hex characters) cryptographically secure random secret
      secret = crypto.randomBytes(32).toString('hex');
      try {
        if (!fs.existsSync(userDataPath)) {
          fs.mkdirSync(userDataPath, { recursive: true });
        }
        fs.writeFileSync(secretFilePath, secret, { encoding: 'utf8', mode: 0o600 });
        console.log('[Desktop] Generated and saved new persistent per-machine JWT_SECRET.');
      } catch (writeErr) {
        console.warn('[Desktop] Warning: Could not persist secret to disk:', writeErr.message);
      }
    }

    // Set process.env.JWT_SECRET if not already defined (or in packaged mode)
    if (!process.env.JWT_SECRET || isPackaged) {
      process.env.JWT_SECRET = secret;
      console.log('[Desktop] Persistent per-machine JWT_SECRET configured.');
    }
  } catch (err) {
    console.error('[Desktop] Failed to configure per-machine secret:', err);
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    }
  }
}

/**
 * Encrypts and persists a session token using OS-backed encryption (safeStorage).
 * Plaintext password is NEVER stored. Only the authenticated JWT session token is persisted.
 */
function savePersistedSessionToken(userDataPath, token) {
  try {
    const sessionFilePath = path.join(userDataPath, '.session-token.enc');
    if (!token) {
      if (fs.existsSync(sessionFilePath)) fs.unlinkSync(sessionFilePath);
      return;
    }

    let cipherBuffer;
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      cipherBuffer = safeStorage.encryptString(token);
    } else {
      // Fallback: AES-256-GCM using per-machine persistent secret
      const machineSecret = process.env.JWT_SECRET || 'fallback-desktop-secret-key-32chars';
      const key = crypto.createHash('sha256').update(machineSecret).digest();
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      cipherBuffer = Buffer.concat([iv, tag, encrypted]);
    }

    fs.writeFileSync(sessionFilePath, cipherBuffer);
    console.log('[Desktop Session] Persisted session token securely to disk.');
  } catch (err) {
    console.error('[Desktop Session] Failed to persist session token:', err.message);
  }
}

/**
 * Loads and decrypts the persisted session token.
 */
function loadPersistedSessionToken(userDataPath) {
  try {
    const sessionFilePath = path.join(userDataPath, '.session-token.enc');
    if (!fs.existsSync(sessionFilePath)) {
      return null;
    }

    const cipherBuffer = fs.readFileSync(sessionFilePath);
    if (!cipherBuffer || cipherBuffer.length === 0) {
      return null;
    }

    let token = null;
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      token = safeStorage.decryptString(cipherBuffer);
    } else {
      // Fallback: AES-256-GCM using per-machine persistent secret
      const machineSecret = process.env.JWT_SECRET || 'fallback-desktop-secret-key-32chars';
      const key = crypto.createHash('sha256').update(machineSecret).digest();
      const iv = cipherBuffer.subarray(0, 12);
      const tag = cipherBuffer.subarray(12, 28);
      const encrypted = cipherBuffer.subarray(28);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      token = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    }

    // Verify token expiration before returning
    if (token) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.log('[Desktop Session] Persisted session token has expired. Discarding.');
          fs.unlinkSync(sessionFilePath);
          return null;
        }
      }
    }

    return token;
  } catch (err) {
    console.warn('[Desktop Session] Could not load persisted session token:', err.message);
    return null;
  }
}

/**
 * Clears the persisted session token from disk.
 */
function clearPersistedSessionToken(userDataPath) {
  try {
    const sessionFilePath = path.join(userDataPath, '.session-token.enc');
    if (fs.existsSync(sessionFilePath)) {
      fs.unlinkSync(sessionFilePath);
      console.log('[Desktop Session] Cleared persisted session token.');
    }
  } catch (err) {
    console.warn('[Desktop Session] Error clearing persisted session token:', err.message);
  }
}

/**
 * Safely and idempotently reconciles SQLite database schema for persistent user databases.
 * Guarantees existing customer data is 100% preserved.
 */
function reconcileDatabaseSchema(userDbPath) {
  if (!fs.existsSync(userDbPath) || fs.statSync(userDbPath).size === 0) {
    return;
  }

  console.log('[Desktop] Database schema reconciliation started');
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(userDbPath);

    try {
      // Verify User table exists
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'").all();
      if (tableCheck.length === 0) {
        console.log('[Desktop] User table not present yet. Skipping reconciliation.');
        return;
      }

      function tableExists(tableName) {
        const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        return !!row;
      }

      function getColumns(tableName) {
        if (!tableExists(tableName)) return [];
        return db.prepare(`PRAGMA table_info("${tableName}")`).all().map(c => c.name);
      }

      // Collect required changes
      const userCols = getColumns('User');
      const missingUserCols = ['status', 'lastLoginAt'].filter(c => !userCols.includes(c));

      const paymentCols = getColumns('Payment');
      const expectedPaymentCols = [
        'loanCategory', 'bankName', 'accountRef', 'principalAmount',
        'interestRate', 'totalTenureMonths', 'paidTenureMonths',
        'loanStartDate', 'loanClosingDate', 'reminderLeadDays'
      ];
      const missingPaymentCols = expectedPaymentCols.filter(c => !paymentCols.includes(c));

      const vehicleCols = getColumns('Vehicle');
      const expectedVehicleCols = ['pucNumber', 'pucIssueDate', 'pucExpiryDate', 'pucNotes'];
      const missingVehicleCols = expectedVehicleCols.filter(c => !vehicleCols.includes(c));

      const expectedTables = ['CreditCard', 'CreditCardEmi', 'Investment', 'HealthProfile', 'HealthInsurance'];
      const missingTables = expectedTables.filter(t => !tableExists(t));

      const needsMigration = (
        missingUserCols.length > 0 ||
        missingPaymentCols.length > 0 ||
        missingVehicleCols.length > 0 ||
        missingTables.length > 0
      );

      // If any column or table is missing, create a safety backup copy before modifying
      if (needsMigration) {
        const backupPath = path.join(path.dirname(userDbPath), `dev.db.pre-reconciliation-${Date.now()}.bak`);
        try {
          fs.copyFileSync(userDbPath, backupPath);
          console.log('[Desktop] Safety backup created at:', backupPath);
        } catch (bErr) {
          console.warn('[Desktop] Warning creating safety backup:', bErr.message);
        }
      }

      function addColumnIfNotExists(tableName, colName, colDef) {
        const cols = getColumns(tableName);
        if (!cols.includes(colName)) {
          try {
            db.exec(`ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colDef};`);
            console.log(`[Desktop Schema] Added column ${tableName}.${colName}`);
          } catch (colErr) {
            console.warn(`[Desktop Schema] Column add warning for ${tableName}.${colName}:`, colErr.message);
          }
        }
      }

      // Reconcile User table
      addColumnIfNotExists('User', 'status', "TEXT DEFAULT 'active'");
      addColumnIfNotExists('User', 'lastLoginAt', 'DATETIME');

      // Reconcile Payment table (Loan / EMI tracking)
      addColumnIfNotExists('Payment', 'loanCategory', 'TEXT');
      addColumnIfNotExists('Payment', 'bankName', 'TEXT');
      addColumnIfNotExists('Payment', 'accountRef', 'TEXT');
      addColumnIfNotExists('Payment', 'principalAmount', 'REAL');
      addColumnIfNotExists('Payment', 'interestRate', 'REAL');
      addColumnIfNotExists('Payment', 'totalTenureMonths', 'INTEGER');
      addColumnIfNotExists('Payment', 'paidTenureMonths', 'INTEGER DEFAULT 0');
      addColumnIfNotExists('Payment', 'loanStartDate', 'DATETIME');
      addColumnIfNotExists('Payment', 'loanClosingDate', 'DATETIME');
      addColumnIfNotExists('Payment', 'reminderLeadDays', 'INTEGER DEFAULT 3');

      // Reconcile Vehicle table (PUC certificate tracking)
      addColumnIfNotExists('Vehicle', 'pucNumber', 'TEXT');
      addColumnIfNotExists('Vehicle', 'pucIssueDate', 'DATETIME');
      addColumnIfNotExists('Vehicle', 'pucExpiryDate', 'DATETIME');
      addColumnIfNotExists('Vehicle', 'pucNotes', 'TEXT');

      // Reconcile new tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS "CreditCard" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "cardName" TEXT NOT NULL,
          "bank" TEXT NOT NULL,
          "network" TEXT DEFAULT 'Visa',
          "lastFour" TEXT NOT NULL,
          "creditLimit" REAL NOT NULL,
          "currentBalance" REAL NOT NULL DEFAULT 0.0,
          "statementDay" INTEGER NOT NULL DEFAULT 1,
          "dueDay" INTEGER NOT NULL DEFAULT 20,
          "minimumDue" REAL DEFAULT 0.0,
          "totalDue" REAL DEFAULT 0.0,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CreditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "CreditCard_userId_idx" ON "CreditCard"("userId");

        CREATE TABLE IF NOT EXISTS "CreditCardEmi" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "cardId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "merchant" TEXT NOT NULL,
          "totalAmount" REAL NOT NULL,
          "monthlyEmi" REAL NOT NULL,
          "interestRate" REAL,
          "tenureMonths" INTEGER NOT NULL,
          "paidMonths" INTEGER NOT NULL DEFAULT 0,
          "startDate" DATETIME NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'active',
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CreditCardEmi_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "CreditCardEmi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "CreditCardEmi_cardId_idx" ON "CreditCardEmi"("cardId");
        CREATE INDEX IF NOT EXISTS "CreditCardEmi_userId_idx" ON "CreditCardEmi"("userId");

        CREATE TABLE IF NOT EXISTS "Investment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "fundHouse" TEXT,
          "folioNumber" TEXT,
          "type" TEXT NOT NULL DEFAULT 'mutual_fund',
          "investmentMode" TEXT NOT NULL DEFAULT 'lumpsum',
          "sipAmount" REAL,
          "sipFrequency" TEXT DEFAULT 'monthly',
          "sipDay" INTEGER,
          "sipStartDate" DATETIME,
          "sipEndDate" DATETIME,
          "totalInvested" REAL NOT NULL DEFAULT 0.0,
          "currentValuation" REAL NOT NULL DEFAULT 0.0,
          "units" REAL,
          "nav" REAL,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "lastValuationDate" DATETIME,
          "notes" TEXT,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "Investment_userId_idx" ON "Investment"("userId");
        CREATE INDEX IF NOT EXISTS "Investment_type_idx" ON "Investment"("type");

        CREATE TABLE IF NOT EXISTS "HealthProfile" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "familyMemberId" TEXT,
          "memberName" TEXT,
          "bloodGroup" TEXT,
          "height" REAL,
          "weight" REAL,
          "allergies" TEXT,
          "chronicConditions" TEXT,
          "medications" TEXT,
          "emergencyContactName" TEXT,
          "emergencyContactPhone" TEXT,
          "doctorName" TEXT,
          "doctorPhone" TEXT,
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HealthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "HealthProfile_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "HealthProfile_familyMemberId_key" ON "HealthProfile"("familyMemberId");
        CREATE INDEX IF NOT EXISTS "HealthProfile_userId_idx" ON "HealthProfile"("userId");

        CREATE TABLE IF NOT EXISTS "HealthInsurance" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "policyName" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "policyNumber" TEXT NOT NULL,
          "sumInsured" REAL NOT NULL,
          "premiumAmount" REAL NOT NULL,
          "premiumFrequency" TEXT NOT NULL DEFAULT 'yearly',
          "startDate" DATETIME NOT NULL,
          "expiryDate" DATETIME NOT NULL,
          "coveredMembers" TEXT,
          "tpaContact" TEXT,
          "cashlessHospitals" TEXT,
          "notes" TEXT,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HealthInsurance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "HealthInsurance_userId_idx" ON "HealthInsurance"("userId");
        CREATE INDEX IF NOT EXISTS "HealthInsurance_expiryDate_idx" ON "HealthInsurance"("expiryDate");
      `);

      console.log('[Desktop] Database schema reconciliation complete');
    } finally {
      db.close();
    }
  } catch (err) {
    console.error('[Desktop Fatal] Database schema reconciliation failed:', err);
    throw new Error(`Database schema reconciliation failed: ${err.message}`);
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

  // Always load .env file if available (development mode)
  loadEnvFile(appRoot);

  const userDataPath = app.getPath('userData');
  // Load persistent user configuration from %APPDATA%\smart-life-manager\.env
  loadUserDataEnvFile(userDataPath);
  // Configure persistent per-machine JWT secret in userData (independent of packaged code)
  setupPerMachineSecret(userDataPath);

  if (!isPackaged) {
    // In development mode, use local prisma/dev.db and ensure local private storage directory exists
    const localPrivateStorage = path.resolve(appRoot, 'storage', 'private');
    if (!fs.existsSync(localPrivateStorage)) {
      fs.mkdirSync(localPrivateStorage, { recursive: true });
    }
    return;
  }

  try {
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

    // Safely reconcile schema on the existing user database before any queries run
    reconcileDatabaseSchema(userDbPath);

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
    console.error('[Desktop Fatal] Failed to initialize user database and storage:', err);
    throw err;
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

async function createMainWindow(appUrl) {
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

  // Restore persisted session into Electron's cookie store before loading URL
  const userDataPath = app.getPath('userData');
  const persistedToken = loadPersistedSessionToken(userDataPath);
  if (persistedToken) {
    try {
      console.log('[Desktop Session] Restoring session token into cookie store...');
      const parsed = new URL(appUrl);
      await session.defaultSession.cookies.set({
        url: appUrl,
        name: 'slm_session',
        value: persistedToken,
        domain: parsed.hostname,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      });
      await session.defaultSession.cookies.flushStore();
      console.log('[Desktop Session] Restored session cookie for', appUrl);
    } catch (cookieErr) {
      console.warn('[Desktop Session] Warning restoring session cookie:', cookieErr.message);
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
    const currentUrl = mainWindow ? mainWindow.webContents.getURL() : appUrl;
    console.log(`[Desktop] Page successfully loaded: ${currentUrl}`);
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

  // Register desktop IPC listeners for external browser opening and window focus
  ipcMain.removeAllListeners('desktop:open-external');
  ipcMain.on('desktop:open-external', (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
  });

  ipcMain.removeAllListeners('desktop:focus-window');
  ipcMain.on('desktop:focus-window', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Register session persistence IPC handlers
  ipcMain.removeHandler('desktop:save-session');
  ipcMain.handle('desktop:save-session', async (_event, token) => {
    savePersistedSessionToken(userDataPath, token);
    if (token) {
      try {
        const parsed = new URL(appUrl);
        await session.defaultSession.cookies.set({
          url: appUrl,
          name: 'slm_session',
          value: token,
          domain: parsed.hostname,
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        });
        await session.defaultSession.cookies.flushStore();
        console.log('[Desktop Session] Saved and flushed session token cookie.');
      } catch (err) {
        console.warn('[Desktop Session] Could not update session cookie directly:', err.message);
      }
    }
    return { success: true };
  });

  ipcMain.removeHandler('desktop:get-session');
  ipcMain.handle('desktop:get-session', async () => {
    return loadPersistedSessionToken(userDataPath);
  });

  ipcMain.removeHandler('desktop:clear-session');
  ipcMain.handle('desktop:clear-session', async () => {
    clearPersistedSessionToken(userDataPath);
    try {
      await session.defaultSession.cookies.remove(appUrl, 'slm_session');
      await session.defaultSession.cookies.flushStore();
      console.log('[Desktop Session] Cleared session cookie from cookie store.');
    } catch (err) {
      console.warn('[Desktop Session] Could not remove cookie directly:', err.message);
    }
    return { success: true };
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
  if (session && session.defaultSession) {
    session.defaultSession.cookies.flushStore().catch(() => {});
  }
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
  if (session && session.defaultSession) {
    session.defaultSession.cookies.flushStore().catch(() => {});
  }
  cleanupServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
