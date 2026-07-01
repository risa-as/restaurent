'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

const isDev = !app.isPackaged;
const STANDALONE_PORT = 3099;

let mainWindow = null;
let tray = null;
let serverProcess = null;

// ---------------------------------------------------------------------------
// Port helpers
// ---------------------------------------------------------------------------

function findAvailablePort(start) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(findAvailablePort(start + 1)));
    server.once('listening', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.listen(start);
  });
}

function waitForServer(url, retries = 30) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const attempt = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else if (retries-- > 0) setTimeout(attempt, 1000);
        else reject(new Error('Server returned error status'));
      });
      req.on('error', () => {
        if (retries-- > 0) setTimeout(attempt, 1000);
        else reject(new Error('Server did not respond'));
      });
      req.end();
    };
    attempt();
  });
}

// ---------------------------------------------------------------------------
// Next.js standalone server (production only)
// ---------------------------------------------------------------------------

async function startNextServer(port) {
  const appDir = path.join(process.resourcesPath, 'app');
  const serverScript = path.join(appDir, 'server.js');

  // Load .env from resources if present
  const envFile = path.join(appDir, '.env');
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile });
  }

  return new Promise((resolve, reject) => {
    serverProcess = spawn(process.execPath, [serverScript], {
      cwd: appDir,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[next]', msg.trim());
      if (!started && msg.includes('ready')) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[next-err]', data.toString().trim());
    });

    serverProcess.on('error', reject);

    // Fallback: resolve via HTTP poll even if stdout message is missed
    waitForServer(`http://127.0.0.1:${port}`).then(() => {
      if (!started) { started = true; resolve(); }
    }).catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// BrowserWindow
// ---------------------------------------------------------------------------

function createWindow(url) {
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon-512.png')
    : path.join(process.resourcesPath, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    backgroundColor: '#0f172a',
    show: false,
    titleBarStyle: 'default',
    title: 'إدارة المطعم',
  });

  // Show loading screen while Next.js boots (production only)
  if (!isDev) {
    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url: href }) => {
    if (!href.startsWith('http://127.0.0.1') && !href.startsWith('http://localhost')) {
      shell.openExternal(href);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  return mainWindow;
}

function loadApp(url) {
  if (mainWindow) mainWindow.loadURL(url);
}

// ---------------------------------------------------------------------------
// System Tray
// ---------------------------------------------------------------------------

function createTray(url) {
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon-192.png')
    : path.join(process.resourcesPath, 'icon.png');

  const img = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(img);
  tray.setToolTip('إدارة المطعم');

  const menu = Menu.buildFromTemplate([
    {
      label: 'فتح التطبيق', click: () => {
        if (mainWindow) mainWindow.focus();
        else { createWindow(url); loadApp(url); }
      },
    },
    { type: 'separator' },
    { label: 'خروج', click: () => { cleanup(); app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.focus();
    else { createWindow(url); loadApp(url); }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  let appUrl;

  if (isDev) {
    appUrl = 'http://localhost:3000';
    createWindow(appUrl);
    // In dev mode Next.js dev server is expected to already be running
    await waitForServer(appUrl).catch(() => {});
    loadApp(appUrl);
  } else {
    const port = await findAvailablePort(STANDALONE_PORT);
    appUrl = `http://127.0.0.1:${port}`;

    createWindow(appUrl);       // shows loading.html immediately
    await startNextServer(port);
    loadApp(appUrl);            // swap loading → real app
  }

  createTray(appUrl);

  app.on('activate', () => {
    if (!mainWindow) { createWindow(appUrl); loadApp(appUrl); }
  });
});

app.on('window-all-closed', () => {
  // Keep alive in tray on macOS; quit on Windows/Linux
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});

app.on('before-quit', cleanup);

function cleanup() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}
