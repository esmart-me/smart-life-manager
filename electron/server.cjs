// electron/server.cjs
// Background Node process that hosts Next.js server for Electron

const http = require('http');
const path = require('path');
const next = require('next');

const appRoot = path.resolve(__dirname, '..');
const requestedPort = parseInt(process.env.PORT || process.argv[2] || '3000', 10);
const isDev = process.env.NODE_ENV === 'development';

async function startServer() {
  const nextApp = next({
    dev: isDev,
    dir: appRoot,
    hostname: '127.0.0.1',
    port: requestedPort,
  });

  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.on('error', (err) => {
    console.error('[Electron Server Error]:', err);
    if (process.send) {
      process.send({ type: 'error', error: err.message });
    }
  });

  server.listen(requestedPort, '127.0.0.1', () => {
    const actualPort = server.address().port;
    const url = `http://127.0.0.1:${actualPort}`;
    console.log(`[Smart Life Manager Desktop] Local server ready at ${url}`);

    if (process.send) {
      process.send({ type: 'ready', port: actualPort, url });
    }
  });

  // Handle graceful termination
  const shutdown = () => {
    console.log('[Smart Life Manager Desktop] Shutting down local server...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('message', (msg) => {
    if (msg === 'shutdown') shutdown();
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[Fatal Electron Server Error]:', err);
  if (process.send) {
    process.send({ type: 'fatal', error: err.message });
  }
  process.exit(1);
});
