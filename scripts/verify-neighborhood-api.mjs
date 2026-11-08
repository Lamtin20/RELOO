import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";
import jsQR from "jsqr";
import { IDS } from "../tests/neighborhood-fixture.mjs";
const latest = JSON.parse(
    await readFile("output/neighborhood-test/latest.json", "utf8"),
  ),
  base = latest.baseUrl;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error("LOCAL_TEST_ONLY");
const cookies = {},
  checks = [];
for (const who of ["renter", "owner", "renter2", "visitor", "admin"]) {
  const r = await fetch(base + "/api/neighborhood/test-session", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "nk-test-" + who }),
  });
  assert.equal(r.status, 200);
  cookies[who] = r.headers.get("set-cookie").split(";")[0];
}
async function get(who, section, filter = {}, admin = false) {
  const r = await fetch(
    base +
      (admin ? "/api/crm/neighborhood" : "/api/neighborhood") +
      "?" +
      new URLSearchParams({ section, ...filter }),
    { headers: { Cookie: cookies[who] || "" } },
  );
  return { status: r.status, data: await r.json() };
}
async function post(
  who,
  action,
  data,
  { admin = false, key = randomUUID(), expected = 200 } = {},
) {
  const r = await fetch(
      base + (admin ? "/api/crm/neighborhood" : "/api/neighborhood"),
      {
        method: "POST",
        headers: {
          Origin: base,
          Cookie: cookies[who] || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, action, data }),
      },
    ),
    json = await r.json();
  assert.equal(r.status, expected, action + ": " + JSON.stringify(json));
  return json;
}
function pass(name) {
  checks.push({ name, result: "PASS" });
  console.log("PASS", name);
}
const bytes = await sharp({
    create: { width: 360, height: 240, channels: 3, background: "#b6d8c0" },
  })
    .png()
    .toBuffer(),
  photo = "data:image/png;base64," + bytes.toString("base64");
const start = new Date(Date.now() + 6 * 86400000).toISOString(),
  end = new Date(Date.now() + 7 * 86400000).toISOString();
const created = await post("owner", "LISTING", {
  area: IDS.area,
  subzone: IDS.subzone,
  building: IDS.building,
  point: IDS.point,
  scope: "AREA",
  title: "TEST API · Máy khoan mới",
  description: "Test-only item created through the real HTTP handler.",
  category: "cong-cu",
  rate: 35000,
  unitMinutes: 1440,
  deposit: 50000,
  minMinutes: 60,
  bufferMinutes: 30,
  accessories: ["TEST drill", "TEST battery"],
  condition: "TEST condition checked",
  instructions: "TEST instructions",
  verifiedOnly: false,
  instant: false,
  images: [photo],
});
assert.equal(created.status, "PENDING");
await post(
  "admin",
  "ADMIN_LISTING",
  { asset: created.asset, status: "ACTIVE", reason: "TEST reviewed item" },
  { admin: true },
);
const results = await get("renter", "search", { area: IDS.area, start, end });
const item = results.data.items.find((i) => i.asset_id === created.asset);
assert.ok(item);
const image = await fetch(base + item.images[0]);
assert.equal(image.status, 200);
assert.equal(image.headers.get("content-type"), "image/webp");
pass("Create listing -> review -> search -> actual WebP image");
await post("owner", "PREFERENCES", {
  locale: "vi-VN",
  match: true,
  marketing: false,
  quietStart: 0,
  quietEnd: 0,
  cap: 10,
});
const need = await post("renter", "NEED", {
  area: IDS.area,
  subzone: IDS.subzone,
  building: IDS.building,
  scope: "AREA",
  title: "TEST API · Cần máy khoan",
  category: "cong-cu",
  note: "Synthetic test need; never send to real users.",
  start,
  end,
  budget: 200000,
  images: [],
});
const offer = await post("owner", "OFFER", {
  need: need.id,
  asset: created.asset,
  note: "TEST offer",
});
assert.ok(offer.id);
pass("Persisted need -> eligible owner offer");
const q = (
  await get("renter", "quote", {
    area: IDS.area,
    asset: created.asset,
    start,
    end,
  })
).data.quote;
const payload = {
  asset: created.asset,
  start,
  end,
  offer: offer.id,
  total: q.total,
  policyVersion: q.policyVersion,
  listingVersion: q.listingVersion,
  agreed: true,
};
const key = randomUUID();
const book = await post("renter", "BOOK", payload, { key });
assert.equal((await post("renter", "BOOK", payload, { key })).id, book.id);
await post("renter2", "BOOK", { ...payload, offer: "" }, { expected: 409 });
pass("Booking idempotency and conflicting second renter");
assert.equal((await get("visitor", "order", { id: book.id })).status, 404);
assert.equal(
  (await get("renter", "order", { id: book.id })).data.handover,
  null,
);
pass("Private order IDOR and handover withheld before confirmation");
await post("owner", "ACCEPT", { id: book.id });
await post("renter", "PAYMENT_REPORT", { id: book.id });
await post("owner", "PAYMENT_ACK", { id: book.id });
await post("owner", "DEPOSIT_ACK", { id: book.id });
assert.equal(
  (await get("renter", "order", { id: book.id })).data.order.status,
  "CONFIRMED",
);
pass("Owner acceptance -> direct payment acknowledgements -> confirmation");
await post("owner", "READY", { id: book.id });
const otp = await post("owner", "ISSUE_OTP", { id: book.id, phase: "PICKUP" });
assert.ok(/^\d{6}$/.test(otp.secret));
assert.ok(otp.qr.startsWith("data:image/webp;base64,"));
const qr = await sharp(Buffer.from(otp.qr.split(",")[1], "base64"))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const decoded = jsQR(
  new Uint8ClampedArray(qr.data),
  qr.info.width,
  qr.info.height,
);
assert.equal(JSON.parse(decoded.data).o, book.id);
pass("Locally generated WebP QR actually decodes and is bound to the order");
const check = {
  id: book.id,
  phase: "PICKUP",
  checked: true,
  checklist: q.accessories,
  images: [photo],
  condition: "TEST inspected accessories",
};
await post(
  "renter",
  "HANDOVER",
  { ...check, code: otp.secret === "000000" ? "000001" : "000000" },
  { expected: 409 },
);
await post("owner", "HANDOVER", check);
await post("renter", "HANDOVER", { ...check, code: otp.secret });
assert.equal(
  (await get("renter", "order", { id: book.id })).data.order.status,
  "ACTIVE",
);
pass("Wrong OTP rejected; both inspected handovers activate rental");
const active = await get("renter", "order", { id: book.id }),
  evidence = active.data.checks[0].images[0];
assert.equal(
  (await fetch(base + evidence, { headers: { Cookie: cookies.renter } }))
    .status,
  200,
);
assert.equal(
  (await fetch(base + evidence, { headers: { Cookie: cookies.visitor } }))
    .status,
  404,
);
pass("Encrypted WebP evidence is participant-only");
assert.equal(
  (await fetch(base + evidence, { headers: { Cookie: cookies.admin } })).status,
  404,
);
assert.equal(
  (
    await fetch(
      base +
        evidence.replace(
          "/api/neighborhood/evidence/",
          "/api/crm/neighborhood/evidence/",
        ),
      {
        headers: { Cookie: cookies.admin },
      },
    )
  ).status,
  200,
);
pass(
  "Staff evidence access requires the separate CRM permission-checked route",
);
const extra = await post("renter", "EXTEND", {
  id: book.id,
  end: new Date(Date.parse(end) + 86400000).toISOString(),
});
await post("owner", "EXTENSION_ACCEPT", {
  id: book.id,
  extension: extra.extensionId,
});
assert.equal(
  Date.parse(
    (await get("renter", "order", { id: book.id })).data.order.ends_at,
  ),
  Date.parse(end),
);
await post("owner", "EXTENSION_PAID", {
  id: book.id,
  extension: extra.extensionId,
});
pass(
  "Extension leaves original deadline unchanged until additional payment acknowledgement",
);
await post("renter", "REQUEST_RETURN", { id: book.id });
const ret = await post("renter", "ISSUE_OTP", { id: book.id, phase: "RETURN" });
const returned = { ...check, phase: "RETURN" };
await post("renter", "HANDOVER", returned);
await post("owner", "HANDOVER", { ...returned, code: ret.secret });
await post("owner", "DEPOSIT_RETURN", { id: book.id });
await post("renter", "DEPOSIT_RETURN_ACK", { id: book.id });
assert.equal(
  (await get("renter", "order", { id: book.id })).data.order.status,
  "COMPLETED",
);
await post("renter", "REVIEW", {
  id: book.id,
  rating: 5,
  note: "TEST completed rental",
});
pass(
  "Return checklist -> completion -> deposit acknowledgement -> verified rental review",
);
await fetch(base + "/api/neighborhood/test-tick", {
  method: "POST",
  headers: { Origin: base },
});
const notifications = (await get("renter", "mine")).data.notifications;
assert.ok(notifications.some((n) => n.aggregate_id === book.id));
pass("Committed outbox delivers to isolated in-app inbox");
const origin = await fetch(base + "/api/neighborhood", {
  method: "POST",
  headers: {
    Origin: "https://evil.example",
    Cookie: cookies.renter,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    key: randomUUID(),
    action: "CANCEL",
    data: { id: book.id },
  }),
});
assert.equal(origin.status, 403);
assert.equal((await get("visitor", "admin", {}, true)).status, 403);
pass("Origin and CRM scope denial");
await writeFile(
  join(latest.root, "api-results.json"),
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      environment: "isolated local PGlite + Next.js real route handlers",
      realExternalMessages: 0,
      realPayments: 0,
      orderId: book.id,
      assetId: created.asset,
      checks,
    },
    null,
    2,
  ),
);
console.log(
  "Completed",
  checks.length,
  "HTTP checks. Receipt contains no OTP, cookie or secret.",
);
