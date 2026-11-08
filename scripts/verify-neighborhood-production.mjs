// Runs the local production build with no production database credentials.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const probe = createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const base = "http://127.0.0.1:" + port;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      RELOO_NEIGHBORHOOD_ENABLED: "false",
      RELOO_NEIGHBORHOOD_TEST_MODE: "1",
      RELOO_NEIGHBORHOOD_TEST_SECRET:
        "deliberately-enabled-test-flag-must-not-work-in-production",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:45999",
      SUPABASE_INTERNAL_URL: "http://127.0.0.1:45999",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      APP_ORIGIN: base,
      CRM_ORIGIN: base,
      RELOO_DATA_REGION: "TEST",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
child.stdout.on("data", (b) => {
  log = (log + b).slice(-5000);
});
child.stderr.on("data", (b) => {
  log = (log + b).slice(-5000);
});
const checks = [];
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base + "/api/health", {
        signal: AbortSignal.timeout(1000),
      });
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, "Isolated production server did not start");
  for (const [path, method, body] of [
    ["/api/neighborhood/test-session", "POST", { actor: "nk-test-admin" }],
    ["/api/neighborhood/test-tick", "POST", {}],
    ["/api/neighborhood/sandbox-webhook", "POST", {}],
    ["/api/neighborhood/test-media/" + randomUUID(), "GET", null],
  ]) {
    const r = await fetch(base + path, {
      method,
      headers: { Origin: base, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.equal(r.status, 404, path);
    checks.push({ path, result: "PASS", status: r.status });
  }
  const catalog = await fetch(base + "/api/neighborhood?section=catalog");
  const data = await catalog.json();
  assert.equal(data.enabled, false);
  assert.deepEqual(data.places, []);
  checks.push({
    path: "/api/neighborhood?section=catalog",
    result: "PASS",
    enabled: false,
  });
  await mkdir("output/neighborhood", { recursive: true });
  await writeFile(
    "output/neighborhood/production-isolation.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        mode: "LOCAL production build, not production deployment",
        checks,
      },
      null,
      2,
    ),
  );
  console.log(checks);
} finally {
  child.kill("SIGTERM");
}
