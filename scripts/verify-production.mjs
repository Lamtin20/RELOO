import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.VERIFY_PRODUCTION_PORT || 3001);
const base = `http://127.0.0.1:${port}`;
try {
  await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(700) });
  throw new Error(`Port ${port} is occupied; use VERIFY_PRODUCTION_PORT`);
} catch (error) {
  if (error.message.includes("occupied")) throw error;
}
const child = spawn(process.execPath, ["scripts/start-production.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    APP_ORIGIN: base,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let startedInDev = false;
child.stdout.on("data", (chunk) => {
  if (/Compiling|next dev/.test(chunk.toString())) startedInDev = true;
});
child.stderr.on("data", () => {});
try {
  const deadline = Date.now() + 25000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error("Production process exited before readiness");
    try {
      const response = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the local process only. */
    }
    await delay(300);
  }
  assert.equal(ready, true, "Production process did not become ready");
  for (const path of [
    "/",
    "/auth",
    "/auth/register",
    "/auth/recover",
    "/auth/reset",
    "/auth/complete",
    "/explore?days=14",
    "/user/user_minh",
    "/account",
    "/cms/privacy",
    "/pricing",
    "/pricing/method",
    "/lend",
    "/images/reloo-camping.jpg",
    "/brand/google-g.png",
  ]) {
    const response = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200, path);
  }
  const redirect = await new Promise((resolve, reject) => {
    const request = httpRequest(
      `${base}/auth?next=%2Flend`,
      { headers: { host: "www.reloo.vn" } },
      (response) => {
        response.resume();
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            location: response.headers.location,
          }),
        );
      },
    );
    request.setTimeout(10000, () =>
      request.destroy(new Error("Redirect check timed out")),
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.location, "https://reloo.vn/auth?next=%2Flend");
  const invalidEmail = await fetch(`${base}/api/auth/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid" }),
  });
  assert.equal(invalidEmail.status, 400);
  const unauthorizedPassword = await fetch(`${base}/api/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "not-a-real-password" }),
  });
  assert.equal(unauthorizedPassword.status, 401);
  const signup = {
    name: "Validation Test",
    email: "validation@example.invalid",
    phone: "0831234567",
    password: "Abcdef1!",
    role: "both",
    agree: true,
  };
  for (const [patch, code] of [
    [{ phone: "0711234567" }, "INVALID_PHONE"],
    [{ password: "abcdef1!" }, "INVALID_PASSWORD"],
  ]) {
    const response = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...signup, ...patch }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, code);
  }
  const incompleteWithoutSession = await fetch(`${base}/api/auth/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signup),
  });
  assert.equal(incompleteWithoutSession.status, 401);
  const invalidPrice = await fetch(`${base}/api/pricing/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "Test" }),
  });
  assert.equal(invalidPrice.status, 400);
  const adminDenied = await fetch(`${base}/api/admin/market-data`);
  assert.equal(adminDenied.status, 401);
  const badCatalog = await fetch(
    `${base}/api/affiliate/products?merchant=invalid`,
  );
  assert.equal(badCatalog.status, 400);
  const invalidCallback = await fetch(
    `${base}/auth/callback?next=https%3A%2F%2Fexample.invalid`,
    { redirect: "manual" },
  );
  const callbackLocation = new URL(invalidCallback.headers.get("location"));
  assert.equal(callbackLocation.origin, base);
  assert.equal(callbackLocation.pathname, "/auth");
  assert.equal(callbackLocation.searchParams.get("error"), "oauth_expired");
  assert.equal(startedInDev, false, "npm start must not use development mode");
  console.log(
    "Production verification passed: startup, auth pages/assets, signup validation, unauthorized onboarding, callback redirect and existing route checks. No real signup was submitted.",
  );
} finally {
  if (child.exitCode === null) {
    const stopped = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await Promise.race([stopped, delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await stopped;
    }
  }
}
