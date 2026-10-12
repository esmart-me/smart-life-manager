// scripts/benchmark-routes.mjs
import http from "http";

const routes = [
  "/",
  "/api/health",
  "/finance",
  "/documents",
  "/vehicles",
  "/admin/customers",
  "/admin/subscriptions",
];

async function measureRoute(path) {
  const times = [];
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    await new Promise((resolve) => {
      http.get(`http://127.0.0.1:32100${path}`, (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve(res.statusCode));
      }).on("error", (err) => resolve(err.message));
    });
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { path, avg: avg.toFixed(1), min: Math.min(...times).toFixed(1), max: Math.max(...times).toFixed(1) };
}

async function run() {
  console.log("Benchmarking Smart Life Manager routes on http://127.0.0.1:32100...\n");
  console.log("| Route | Avg Latency (ms) | Min (ms) | Max (ms) |");
  console.log("| :--- | :--- | :--- | :--- |");
  for (const r of routes) {
    const res = await measureRoute(r);
    console.log(`| \`${res.path}\` | ${res.avg} ms | ${res.min} ms | ${res.max} ms |`);
  }
}

run();
