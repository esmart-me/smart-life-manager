// scripts/wait-port.mjs
// Lightweight, zero-dependency port readiness polling for Electron dev startup
import http from 'node:http';

const targetUrl = process.argv[2] || 'http://127.0.0.1:3000';
const maxAttempts = 60;
let attempts = 0;

function poll() {
  attempts++;
  const req = http.get(targetUrl, (res) => {
    // Port is responding
    process.exit(0);
  });

  req.on('error', () => {
    if (attempts >= maxAttempts) {
      console.warn(`[wait-port] Port ${targetUrl} did not respond within 30 seconds. Proceeding anyway...`);
      process.exit(0);
    }
    setTimeout(poll, 500);
  });

  req.setTimeout(1000, () => {
    req.destroy();
  });
}

poll();
