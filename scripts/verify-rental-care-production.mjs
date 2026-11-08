import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID,createHmac } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const checks = [];
async function verify(enabled) {
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
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "production",
        RELOO_RENTAL_CARE_ENABLED: String(enabled),
        RELOO_PERSONALIZATION_ENABLED: String(enabled),
        RELOO_NEIGHBORHOOD_ENABLED: "false",
        RELOO_NEIGHBORHOOD_TEST_MODE: "1",
        RELOO_CARE_TEST_MODE: "1",
        RELOO_NEIGHBORHOOD_TEST_SECRET:
          "intentionally-public-test-value-must-not-work-in-production",
        RELOO_CALENDAR_CLIENT_ID: "",
        RELOO_CALENDAR_CLIENT_SECRET: "",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:45999",
        SUPABASE_INTERNAL_URL: "http://127.0.0.1:45999",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        APP_ORIGIN: base,
        CRM_ORIGIN: base,
        RELOO_DATA_REGION: "TEST",
      },
    },
  );
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if (
          (
            await fetch(base + "/api/health", {
              signal: AbortSignal.timeout(1000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(ready, "Isolated production build did not start");
    for (const path of [
      "/api/neighborhood/test-session",
      "/api/neighborhood/test-tick",
      "/api/neighborhood/sandbox-webhook",
      "/api/neighborhood/test-media/" + randomUUID(),
    ]) {
      const r = await fetch(base + path, {
        method: path.includes("test-media") ? "GET" : "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: path.includes("test-media") ? undefined : "{}",
      });
      assert.equal(r.status, 404);
      checks.push({
        name: path,
        featureEnabled: enabled,
        result: "PASS",
        status: r.status,
      });
    }
    for (const path of ["/api/rental-care", "/api/personalization"]) {
      const forged='nk-test-admin.'+createHmac('sha256','intentionally-public-test-value-must-not-work-in-production').update('nk-test-admin').digest('base64url');
      const r = await fetch(base + path,{headers:{Cookie:'reloo-nk-test='+forged}}),
        data = await r.json();
      if (enabled) {
        assert.ok([401, 503].includes(r.status));
        assert.ok(!data.testMode && !data.actor);
      } else {
        assert.equal(r.status, 200);
        assert.equal(data.enabled, false);
        assert.ok(!data.actor);
      }
      checks.push({
        name: path,
        featureEnabled: enabled,
        result: "PASS",
        status: r.status,
      });
    }
    if (!enabled) {
      const r = await fetch(base + "/api/personalization", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "nk-test-admin",
          action: "preferences",
          enabled: true,
          categories: [],
        }),
      });
      assert.equal(r.status, 503);
      assert.equal((await r.json()).code, "FEATURE_DISABLED");
      checks.push({
        name: "Disabled mutation must not claim saved",
        result: "PASS",
      });
    }
  } finally {
    child.kill("SIGTERM");
  }
}
await verify(false);
await verify(true);
await mkdir("output/rental-care", { recursive: true });
await writeFile(
  "output/rental-care/production-isolation.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      mode: "LOCAL production build only; no production deployment",
      checks,
    },
    null,
    2,
  ),
);
console.log(checks.length, "production isolation checks passed.");
