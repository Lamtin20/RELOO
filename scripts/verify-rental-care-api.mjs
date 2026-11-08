import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const manifest = JSON.parse(
    await readFile("output/rental-care/latest.json", "utf8"),
  ),
  base = manifest.baseUrl;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw Error("LOCAL_TEST_ONLY");
const cookies = {},
  checks = [];
async function session(who) {
  const r = await fetch(base + "/api/neighborhood/test-session", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "nk-test-" + who }),
  });
  assert.equal(r.status, 200);
  cookies[who] = r.headers.get("set-cookie").split(";")[0];
}
for (const who of ["renter", "owner", "renter2"]) await session(who);
async function get(who, path) {
  const r = await fetch(base + path, { headers: { Cookie: cookies[who] } }),
    data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  return data;
}
async function post(who, path, body, status = 200) {
  const r = await fetch(base + path, {
      method: "POST",
      headers: {
        Origin: base,
        Cookie: cookies[who],
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    data = await r.json();
  assert.equal(r.status, status, JSON.stringify(data));
  return data;
}
const personal = (who, body, status = 200) =>
  post(
    who,
    "/api/personalization",
    { subject: "nk-test-" + who, ...body },
    status,
  );
const care = (who, body, status = 200) =>
  post(who, "/api/rental-care", { subject: "nk-test-" + who, ...body }, status);
const nk = (who, action, data) =>
  post(who, "/api/neighborhood", { key: randomUUID(), action, data });
const pass = (name) => {
  checks.push({ name, result: "PASS" });
  console.log("PASS", name);
};
const before = await get("renter", "/api/rental-care");
assert.equal(before.preferences.destination, "NONE");
assert.deepEqual(before.connections, []);
assert.ok(before.registeredEmail.includes("@"));
assert.equal(before.googleConfigured, false);
pass(
  "Verified login email does not imply a Google Calendar grant; missing provider configuration is explicit",
);
await personal("renter", {
  action: "preferences",
  enabled: true,
  categories: [],
});
const consent = await get("renter", "/api/personalization"),
  id = randomUUID(),
  event = {
    id,
    version: 1,
    epoch: consent.epoch,
    kind: "SEARCH",
    query: "máy hút bụi",
    at: new Date().toISOString(),
  };
assert.equal(
  (await personal("renter", { action: "event", event })).result,
  "RECORDED",
);
assert.equal(
  (await personal("renter", { action: "event", event })).result,
  "DUPLICATE",
);
await personal("renter", {
  action: "event",
  event: {
    id: randomUUID(),
    version: 1,
    epoch: consent.epoch,
    kind: "ENGAGED_VIEW",
    asset: "test-vacuum",
    activeSeconds: 15,
    at: new Date().toISOString(),
  },
});
const recommended = await personal("renter", {
  action: "recommend",
  ids: ["test-vacuum", "test-cleaner", "test-camera"],
});
assert.ok(recommended.items[0].title.includes("hút bụi"));
assert.equal(recommended.items[0].reason, "interest");
pass(
  "Real HTTP events adapt vacuum recommendations; duplicate IDs do not amplify interest",
);
const second = await get("renter2", "/api/personalization");
assert.equal(second.enabled, false);
assert.deepEqual(second.categories, []);
await post(
  "renter2",
  "/api/personalization",
  { subject: "nk-test-renter", action: "event", event },
  403,
);
pass(
  "Account isolation and stale-client subject mismatch are enforced on the server",
);
await personal(
  "renter",
  { action: "event", event: { ...event, id: randomUUID(), latitude: 10 } },
  400,
);
await personal(
  "renter",
  { action: "event", event: { ...event, id: randomUUID(), kind: "COMPLETED" } },
  400,
);
pass(
  "Client coordinates, arbitrary fields and forged completed-rental events are rejected",
);
await personal("renter", {
  action: "exclude",
  kind: "PRODUCT",
  target: "test-vacuum",
  enabled: true,
});
const hidden = await personal("renter", {
  action: "recommend",
  ids: ["test-vacuum", "test-cleaner", "test-camera"],
});
assert.ok(!hidden.items.some((i) => i.id === "test-vacuum"));
pass("Not interested / hide excludes the actual product from server results");
await personal("renter", { action: "clear", all: false });
assert.equal(
  (
    await personal("renter", {
      action: "event",
      event: { ...event, id: randomUUID() },
    })
  ).result,
  "NO_CONSENT",
);
await personal("renter", {
  action: "preferences",
  enabled: false,
  categories: [],
});
const off = await personal("renter", {
  action: "recommend",
  ids: ["test-camera", "test-cleaner"],
});
assert.equal(off.enabled, false);
assert.ok(off.items.every((i) => i.reason === "explore"));
assert.equal(
  (
    await personal("renter", {
      action: "event",
      event: { ...event, id: randomUUID() },
    })
  ).result,
  "NO_CONSENT",
);
pass(
  "Clearing invalidates old event epochs; opt-out stops writes and produces usable contextual discovery",
);
const device = randomUUID(),
  created = await care("renter", {
    action: "device",
    device,
    calendar: "TEST-local-calendar",
    name: "TEST local calendar",
    independent: true,
  });
await care("renter", {
  action: "activate",
  id: created.id,
  confirmSwitch: true,
});
const ready = await get("renter", "/api/rental-care");
assert.equal(ready.preferences.destination, "DEVICE");
assert.equal(ready.events.length, 0);
assert.ok(!ready.connections.some((c) => c.credentials_encrypted));
pass(
  "Device destination consent is stored separately; no sync success is claimed before a receipt",
);
const start = new Date(Date.now() + 5 * 86400000).toISOString(),
  end = new Date(Date.now() + 6 * 86400000).toISOString();
const quote = await get(
  "renter",
  "/api/neighborhood?" +
    new URLSearchParams({
      section: "quote",
      area: "10000000-0000-4000-8000-000000000001",
      asset: "nk-test-drill",
      start,
      end,
    }),
);
const booked = await nk("renter", "BOOK", {
  asset: "nk-test-drill",
  start,
  end,
  policyVersion: quote.quote.policyVersion,
  listingVersion: quote.quote.listingVersion,
  total: quote.quote.total,
  agreed: true,
});
assert.equal((await get("renter", "/api/rental-care")).events.length, 0);
await nk("owner", "ACCEPT", { id: booked.id });
await nk("renter", "PAYMENT_REPORT", { id: booked.id });
await nk("owner", "PAYMENT_ACK", { id: booked.id });
await nk("owner", "DEPOSIT_ACK", { id: booked.id });
const jobs = (await care("renter", { action: "claim", device })).jobs;
assert.equal(jobs.length, 1);
assert.equal(jobs[0].state, "CONFIRMED");
assert.equal(
  (await care("renter2", { action: "claim", device })).jobs.length,
  0,
);
pass(
  "A subsequent confirmed rental automatically creates one owned device sync job; pending requests do not",
);
const job = jobs[0];
await care(
  "renter",
  {
    action: "ack",
    id: job.id,
    lease: randomUUID(),
    revision: job.revision,
    remote: "TEST-event-1",
    result: "SYNCED",
  },
  403,
);
await care("renter", {
  action: "ack",
  id: job.id,
  lease: job.lease,
  revision: job.revision,
  remote: "TEST-event-1",
  result: "SYNCED",
});
await care("renter", {
  action: "ack",
  id: job.id,
  lease: job.lease,
  revision: job.revision,
  remote: "TEST-event-1",
  result: "SYNCED",
});
assert.equal(
  (await get("renter", "/api/rental-care")).events[0].status,
  "SYNCED",
);
pass(
  "Lease ownership and replay-safe acknowledgement work; device receipt is SIMULATED, not an OS integration test",
);
await nk("renter", "CANCEL", {
  id: booked.id,
  reason: "TEST cancellation before handover",
});
const cancellation = (await care("renter", { action: "claim", device })).jobs;
assert.equal(cancellation.length, 1);
assert.equal(cancellation[0].state, "CANCELLED");
assert.equal(cancellation[0].remoteId, "TEST-event-1");
pass(
  "Cancellation queues an update for the existing event mapping, not another event",
);
await care("renter", { action: "devicePermission", device, granted: false });
assert.ok(
  (await get("renter", "/api/rental-care")).events.every(
    (event) => event.status !== "SYNCING",
  ),
);
assert.equal(
  (await get("renter", "/api/rental-care")).connections[0].status,
  "REAUTH",
);
pass(
  "Permission loss produces reconnect-required state instead of fake sync success",
);
const origin = await fetch(base + "/api/personalization", {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    Cookie: cookies.renter,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    subject: "nk-test-renter",
    action: "clear",
    all: true,
  }),
});
assert.equal(origin.status, 403);
pass("Cross-origin writes are rejected");
await mkdir("output/rental-care", { recursive: true });
await writeFile(
  "output/rental-care/http-results.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      environment: "Next route handlers + persisted isolated PGlite",
      checks,
      externalProviderCalls: 0,
      realPayments: 0,
      deviceReceipt: "SIMULATED; no phone calendar was accessed",
    },
    null,
    2,
  ),
);
console.log(
  "Completed",
  checks.length,
  "HTTP checks. No Google token, OTP or cookie is included in the receipt.",
);
