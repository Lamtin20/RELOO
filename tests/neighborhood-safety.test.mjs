import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createNeighborhoodFixture, IDS } from "./neighborhood-fixture.mjs";
import { validateInput } from "../lib/neighborhood/validation.js";
import {
  validateFeedUrl,
  normalizePlace,
  duplicateCandidates,
  verifySandboxWebhook,
} from "../lib/neighborhood/providers.js";
import { neighborhoodTestEnabled } from "../lib/neighborhood/test-runtime.js";
import { handoverQr } from "../lib/neighborhood/qr.js";
import sharp from "sharp";
import jsQR from "jsqr";
import {
  residencyMethods,
  verifyResidencyWithPartner,
} from "../lib/neighborhood/residency.js";
import { dispatchOptionalChannel } from "../lib/neighborhood/channels.js";
const digest = (s) => createHash("sha256").update(s).digest("hex");
test("unconfigured partner verification and optional channels never claim success or send without consent", async () => {
  assert.deepEqual(residencyMethods({}), ["MANUAL", "INVITE"]);
  assert.deepEqual(
    residencyMethods({
      RELOO_NEIGHBORHOOD_RESIDENCY_METHODS: "GPS,INVITE,INVITE",
    }),
    ["INVITE"],
  );
  await assert.rejects(
    verifyResidencyWithPartner({ profileId: "test", areaId: IDS.area }),
    /RESIDENCY_PROVIDER_UNAVAILABLE/,
  );
  await assert.rejects(
    dispatchOptionalChannel({ channel: "email", payload: {} }),
    /CHANNEL_CONSENT_REQUIRED/,
  );
  await assert.rejects(
    dispatchOptionalChannel(
      { channel: "push", payload: {} },
      { consented: true },
    ),
    /CHANNEL_NOT_CONFIGURED/,
  );
});
test("physical location changes require residency review and keyword matching handles Vietnamese without accents", async () => {
  const db = await createNeighborhoodFixture();
  try {
    assert.equal(
      Number(
        (
          await db.query(
            "select nk_match_score('Máy khoan Bosch','may khoan') score",
          )
        ).rows[0].score,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select nk_match_score('Búa cầm tay','may khoan') score",
          )
        ).rows[0].score,
      ),
      0,
    );
    await db.query("update nk_places set geometry=$2::jsonb where id=$1", [
      IDS.area,
      JSON.stringify({ type: "Point", coordinates: [106.81, 10.81] }),
    ]);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from nk_memberships where status='REVERIFY'",
        )
      ).rows[0].n,
      3,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from nk_outbox where event='RESIDENCY_UPDATED'",
        )
      ).rows[0].n,
      3,
    );
  } finally {
    await db.close();
  }
});
function harness(db) {
  const act = async (actor, action, data, key = randomUUID()) =>
    (
      await db.query("select reloo_neighborhood_action($1,$2,$3,$4::jsonb) r", [
        actor,
        key,
        action,
        JSON.stringify(data),
      ])
    ).rows[0].r;
  const read = async (actor, section, filter = {}) =>
    (
      await db.query("select reloo_neighborhood_read($1,$2,$3::jsonb) r", [
        actor,
        section,
        JSON.stringify(filter),
      ])
    ).rows[0].r;
  const clock = Date.now(),
    start = new Date(clock + 2 * 86400000).toISOString(),
    end = new Date(clock + 3 * 86400000).toISOString();
  const booking = async (actor = "nk-test-renter", extra = {}) => {
    const q = (
      await read(actor, "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
      })
    ).quote;
    return act(actor, "BOOK", {
      asset: "nk-test-drill",
      start,
      end,
      policyVersion: q.policyVersion,
      listingVersion: q.listingVersion,
      total: q.total,
      agreed: true,
      ...extra,
    });
  };
  return { act, read, start, end, booking };
}
test("provider URL/geometry/input boundaries, HMAC signatures, replay window and production test isolation", () => {
  assert.throws(
    () => validateFeedUrl("http://feed.example/places", "feed.example"),
    /SOURCE_NOT_ALLOWED/,
  );
  assert.throws(() =>
    validateFeedUrl("https://evil.example/places", "feed.example"),
  );
  assert.throws(() =>
    validateFeedUrl("https://name:password@feed.example/", "feed.example"),
  );
  assert.equal(
    validateFeedUrl("https://feed.example/v1/places", "feed.example").hostname,
    "feed.example",
  );
  const p = normalizePlace({
    kind: "AREA",
    externalId: "1",
    name: " Khu thử nghiệm ",
    addressRaw: " A   B ",
    geometry: { type: "Point", coordinates: [106.8, 10.8] },
  });
  assert.equal(p.address, "A B");
  assert.equal(
    duplicateCandidates(p, [
      {
        id: "retained",
        kind: "AREA",
        name: p.name,
        address_normalized: p.address,
      },
    ])[0],
    "retained",
  );
  assert.throws(
    () => validateInput("ADMIN_ENABLE", { id: IDS.area, enabled: true }),
    /INVALID_INPUT/,
  );
  assert.throws(() => validateInput("BOOK", { total: -1 }), /INVALID_INPUT/);
  assert.throws(
    () => validateInput("HANDOVER", { images: ["https://evil.example/a.png"] }),
    /INVALID_INPUT/,
  );
  const secret = "a".repeat(64),
    raw = JSON.stringify({
      eventId: "event1",
      orderId: randomUUID(),
      amount: 1,
      sequence: 1,
      status: "PAID",
    }),
    ts = String(Math.floor(Date.now() / 1000)),
    headers = new Headers({
      "x-reloo-timestamp": ts,
      "x-reloo-signature":
        "v1=" +
        createHmac("sha256", secret)
          .update(ts + "." + raw)
          .digest("hex"),
    });
  assert.equal(verifySandboxWebhook(raw, headers, secret).eventId, "event1");
  assert.throws(() => verifySandboxWebhook(raw + " ", headers, secret));
  assert.throws(() =>
    verifySandboxWebhook(raw, headers, secret, Date.now() + 600000),
  );
  const old = {
    node: process.env.NODE_ENV,
    flag: process.env.RELOO_NEIGHBORHOOD_TEST_MODE,
    secret: process.env.RELOO_NEIGHBORHOOD_TEST_SECRET,
  };
  process.env.NODE_ENV = "production";
  process.env.RELOO_NEIGHBORHOOD_TEST_MODE = "1";
  process.env.RELOO_NEIGHBORHOOD_TEST_SECRET = secret;
  assert.equal(neighborhoodTestEnabled(), false);
  for (const [k, v] of Object.entries({
    NODE_ENV: old.node,
    RELOO_NEIGHBORHOOD_TEST_MODE: old.flag,
    RELOO_NEIGHBORHOOD_TEST_SECRET: old.secret,
  })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
test("QR is generated locally as WebP and decodes to a non-PII order-bound token", async () => {
  const id = randomUUID(),
    qr = await handoverQr(id, "RETURN", "123456");
  assert.ok(qr.startsWith("data:image/webp;base64,"));
  const image = await sharp(Buffer.from(qr.split(",")[1], "base64"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = jsQR(
    new Uint8ClampedArray(image.data),
    image.info.width,
    image.info.height,
  );
  assert.deepEqual(JSON.parse(decoded.data), {
    v: 1,
    o: id,
    p: "RETURN",
    c: "123456",
  });
});
test("handover hours use Vietnam time and expired evidence is protected while disputes remain open", async () => {
  const db = await createNeighborhoodFixture(),
    { act, booking } = harness(db);
  try {
    await db.exec(
      "update nk_listings set handover_start=8,handover_end=22 where asset_id='nk-test-drill'",
    );
    const window = (s, e) =>
      db.query("select nk_handover_window('nk-test-drill',$1,$2) ok", [s, e]);
    assert.equal(
      (await window("2026-12-20T01:00:00Z", "2026-12-20T15:00:00Z")).rows[0].ok,
      true,
    );
    assert.equal(
      (await window("2026-12-20T00:00:00Z", "2026-12-20T03:00:00Z")).rows[0].ok,
      false,
    );
    assert.equal(
      (await window("2026-12-20T01:00:00Z", "2026-12-20T15:01:00Z")).rows[0].ok,
      false,
    );
    await db.exec(
      "update nk_listings set handover_start=0,handover_end=24 where asset_id='nk-test-drill'",
    );
    const b = await booking();
    await act("nk-test-renter", "CANCEL", {
      id: b.id,
      reason: "TEST close before retention",
    });
    const id = randomUUID();
    await db.query(
      "insert into nk_evidence(id,order_id,profile_id,filename,expires_at) values($1,$2,'nk-test-renter',$3,now()-interval '1 day')",
      [id, b.id, id + ".enc"],
    );
    await act("nk-test-renter", "ISSUE", {
      id: b.id,
      note: "TEST keep evidence for a real support review",
      images: [],
    });
    assert.equal(
      (await db.query("select * from reloo_neighborhood_claim_purge()")).rows
        .length,
      0,
    );
    await act("nk-test-admin", "RESOLVE", {
      id: b.id,
      reason: "TEST manual support resolution",
    });
    await db.query(
      "update nk_evidence set expires_at=now()-interval '1 day' where id=$1",
      [id],
    );
    assert.equal(
      (await db.query("select * from reloo_neighborhood_claim_purge()")).rows[0]
        .id,
      id,
    );
    await assert.rejects(
      act("nk-test-owner", "ISSUE", {
        id: b.id,
        note: "TEST issue during purge",
      }),
      /RETRY_LATER/,
    );
    await db.query("select reloo_neighborhood_finish_purge($1)", [id]);
    assert.equal(
      (await db.query("select count(*)::int n from nk_evidence")).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query("select count(*)::int n from nk_orders where id=$1", [
          b.id,
        ])
      ).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});
test("neighborhood-only assets cannot enter legacy checkout, and asset safety flags are enforced", async () => {
  const db = await createNeighborhoodFixture(),
    { read, booking, start, end } = harness(db);
  try {
    await db.exec(
      "update assets set dispute_status='active' where id='nk-test-drill'",
    );
    assert.equal(
      (await read("nk-test-renter", "search", { area: IDS.area, start, end }))
        .items.length,
      0,
    );
    await assert.rejects(booking(), /NOT_FOUND/);
    await db.exec(
      "update assets set dispute_status=null,status='paused',listing_data='{}'::jsonb||jsonb_build_object('neighborhoodOnly',true) where id='nk-test-drill'",
    );
    assert.equal(
      (await read("nk-test-renter", "search", { area: IDS.area, start, end }))
        .items.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into transactions(id,asset_id,status,start_date,end_date) values('legacy-escape','nk-test-drill','pending',$1::date,$2::date)",
        [start, end],
      ),
      /NEIGHBORHOOD_CHECKOUT_REQUIRED/,
    );
    assert.ok((await booking()).id);
  } finally {
    await db.close();
  }
});
test("drafts do not reserve calendars and submission rechecks conflicts", async () => {
  const db = await createNeighborhoodFixture(),
    { act, read, start, end, booking } = harness(db);
  try {
    const q = (
      await read("nk-test-renter", "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
      })
    ).quote;
    const draft = await act("nk-test-renter", "BOOK_DRAFT", {
      asset: "nk-test-drill",
      start,
      end,
      total: q.total,
      policyVersion: 1,
      listingVersion: 1,
      agreed: true,
    });
    assert.equal(draft.status, "DRAFT");
    const held = await booking("nk-test-renter2");
    await assert.rejects(
      act("nk-test-renter", "SUBMIT_DRAFT", { id: draft.id }),
      /SLOT_CONFLICT/,
    );
    await act("nk-test-renter2", "CANCEL", {
      id: held.id,
      reason: "TEST release slot",
    });
    assert.equal(
      (await act("nk-test-renter", "SUBMIT_DRAFT", { id: draft.id })).status,
      "PENDING_OWNER",
    );
  } finally {
    await db.close();
  }
});
test("fee offers enforce verified residency, fee ceiling, one claim and atomic budget, without reducing owner price or deposit", async () => {
  const db = await createNeighborhoodFixture(),
    { act, read, start, end } = harness(db);
  try {
    await act("nk-test-admin", "ADMIN_POLICY", {
      area: IDS.area,
      terms: {
        "vi-VN": "TEST policy, real deployment needs reviewed terms.",
        "en-US": "TEST policy, real deployment needs reviewed terms.",
      },
      feeBps: 1000,
      holdMinutes: 30,
      paymentMinutes: 30,
      cancelBeforeHours: 0,
      reason: "TEST explicit policy",
    });
    const promo = await act("nk-test-admin", "ADMIN_PROMOTION", {
      area: IDS.area,
      title: { "vi-VN": "TEST ưu đãi phí", "en-US": "TEST fee offer" },
      terms: {
        "vi-VN": "TEST một lượt, chỉ giảm phí RELOO; không miễn cọc.",
        "en-US": "TEST one use; RELOO fee waiver only, no deposit waiver.",
      },
      amount: 3000,
      budget: 3000,
      expires: new Date(Date.now() + 86400000).toISOString(),
      enabled: true,
      reason: "TEST bounded budget",
    });
    const q = (
      await read("nk-test-renter", "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
        promotion: promo.id,
      })
    ).quote;
    assert.equal(q.discount, 3000);
    assert.equal(q.rent, 45000);
    assert.equal(q.deposit, 100000);
    assert.equal(q.total, 146500);
    const b = await act("nk-test-renter", "BOOK", {
      asset: "nk-test-drill",
      start,
      end,
      promotion: promo.id,
      total: q.total,
      policyVersion: q.policyVersion,
      listingVersion: 1,
      agreed: true,
    });
    await act("nk-test-renter", "CANCEL", {
      id: b.id,
      reason: "TEST cancellation does not reissue promotion",
    });
    await assert.rejects(
      read("nk-test-renter", "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
        promotion: promo.id,
      }),
      /PROMOTION_INELIGIBLE/,
    );
    await assert.rejects(
      read("nk-test-renter2", "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
        promotion: promo.id,
      }),
      /PROMOTION_INELIGIBLE/,
    );
    assert.equal(
      (
        await db.query("select used::int from nk_promotions where id=$1", [
          promo.id,
        ])
      ).rows[0].used,
      3000,
    );
  } finally {
    await db.close();
  }
});
test("need to eligible offer to booking; concurrent callers get one hold; legacy reservations share the calendar", async () => {
  const db = await createNeighborhoodFixture();
  const { act, read, start, end, booking } = harness(db);
  try {
    const need = await act("nk-test-renter", "NEED", {
      area: IDS.area,
      scope: "AREA",
      title: "TEST máy khoan",
      category: "cong-cu",
      note: "TEST only",
      start,
      end,
      images: [],
      budget: 200000,
    });
    await assert.rejects(
      act("nk-test-visitor", "OFFER", {
        need: need.id,
        asset: "nk-test-drill",
        note: "TEST",
      }),
      /FORBIDDEN/,
    );
    const offer = await act("nk-test-owner", "OFFER", {
      need: need.id,
      asset: "nk-test-drill",
      note: "TEST offer",
    });
    const q = (
      await read("nk-test-renter", "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
      })
    ).quote;
    const tasks = ["nk-test-renter", "nk-test-renter2"].map((actor, i) =>
      act(actor, "BOOK", {
        asset: "nk-test-drill",
        start,
        end,
        total: q.total,
        policyVersion: 1,
        listingVersion: 1,
        agreed: true,
        ...(i === 0 ? { offer: offer.id } : {}),
      }),
    );
    const settled = await Promise.allSettled(tasks);
    assert.equal(settled.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      settled.filter(
        (r) =>
          r.status === "rejected" && /SLOT_CONFLICT/.test(r.reason.message),
      ).length,
      1,
    );
    const order = settled.find((r) => r.status === "fulfilled").value;
    await assert.rejects(
      db.query(
        "insert into rental_agreements(listing_id,status,starts_at,ends_at) values('nk-test-drill','ACCEPTED',$1,$2)",
        [start, end],
      ),
      /SLOT_CONFLICT/,
    );
    await assert.rejects(
      db.query(
        "insert into transactions(id,asset_id,status,start_date,end_date) values('legacy','nk-test-drill','IN_USE',$1::date,$2::date)",
        [start, end],
      ),
      /SLOT_CONFLICT/,
    );
    await act("nk-test-owner", "REJECT", {
      id: order.id,
      reason: "TEST owner unavailable",
    });
    assert.equal(
      (await read("nk-test-renter", "order", { id: order.id })).order.status,
      "CANCELLED",
    );
    const again = await booking();
    await db.query(
      "update nk_orders set hold_until=now()-interval '1 minute' where id=$1",
      [again.id],
    );
    await db.query("select reloo_neighborhood_maintenance()");
    assert.equal(
      (await read("nk-test-renter", "order", { id: again.id })).order.status,
      "EXPIRED",
    );
    const third = await booking();
    await db.exec("update nk_listings set rate=99999,version=version+1");
    assert.equal(
      (await read("nk-test-renter", "order", { id: third.id })).order.snapshot
        .rate,
      45000,
    );
    await act("nk-test-renter", "CANCEL", {
      id: third.id,
      reason: "TEST plans changed",
    });
    await db.query(
      "insert into rental_agreements(listing_id,status,starts_at,ends_at) values('nk-test-drill','ACTIVE',$1,$2)",
      [start, end],
    );
    await assert.rejects(booking(), /SLOT_CONFLICT/);
  } finally {
    await db.close();
  }
});
test("residency cannot be inferred from GPS, invites expire/consume once, changed building requires reverification, admin scopes enforced", async () => {
  const db = await createNeighborhoodFixture(),
    { act, read } = harness(db);
  try {
    const m = await act("nk-test-visitor", "MEMBERSHIP", {
      area: IDS.area,
      building: IDS.otherBuilding,
      visible: false,
    });
    assert.equal(
      (await read("nk-test-visitor", "mine")).memberships[0].status,
      "SELECTED",
    );
    await assert.rejects(
      act("nk-test-visitor", "ADMIN_VERIFY", {
        id: m.id,
        status: "VERIFIED",
        reason: "TEST reason",
      }),
      /FORBIDDEN/,
    );
    const code = digest("TEST-invitation");
    await act("nk-test-admin", "ADMIN_INVITE", {
      area: IDS.area,
      building: IDS.otherBuilding,
      profile: "nk-test-visitor",
      hours: 24,
      codeHash: code,
      reason: "TEST eligible resident",
    });
    await act("nk-test-visitor", "VERIFY", {
      membership: m.id,
      inviteHash: code,
      note: "TEST",
    });
    assert.equal(
      (await read("nk-test-visitor", "mine")).memberships[0].status,
      "VERIFIED",
    );
    await act("nk-test-visitor", "MEMBERSHIP", {
      area: IDS.area,
      building: IDS.building,
    });
    assert.equal(
      (await read("nk-test-visitor", "mine")).memberships[0].status,
      "REVERIFY",
    );
    await assert.rejects(
      act("nk-test-visitor", "VERIFY", { membership: m.id, inviteHash: code }),
      /INVITE_INVALID/,
    );
    await act("nk-test-visitor", "VERIFY", {
      membership: m.id,
      note: "TEST manual review",
    });
    await act("nk-test-admin", "ADMIN_VERIFY", {
      id: m.id,
      status: "VERIFIED",
      reason: "TEST reviewed against authorized partner evidence",
    });
    assert.equal(
      (await read("nk-test-visitor", "mine")).memberships[0].status,
      "VERIFIED",
    );
    await db.exec(
      "update nk_memberships set verified_until=now()-interval '1 second' where profile_id='nk-test-visitor'",
    );
    await db.query("select reloo_neighborhood_maintenance()");
    assert.equal(
      (await read("nk-test-visitor", "mine")).memberships[0].status,
      "REVERIFY",
    );
    await assert.rejects(read("nk-test-visitor", "admin"), /FORBIDDEN/);
    const anon = (
      await db.query(
        "select has_function_privilege('anon','reloo_neighborhood_action(text,uuid,text,jsonb)','EXECUTE') allowed",
      )
    ).rows[0];
    assert.equal(anon.allowed, false);
    await db.exec(
      await readFile("deploy/vietnam/security-lockdown.sql", "utf8"),
    );
    assert.equal(
      (
        await db.query(
          "select has_table_privilege('authenticated','nk_memberships','SELECT') allowed",
        )
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});
test("source staging keeps last valid version, locked records survive sync, duplicate changes deduplicate and remain reviewable", async () => {
  const db = await createNeighborhoodFixture(),
    { act } = harness(db);
  try {
    const src = await act("nk-test-admin", "ADMIN_SOURCE", {
      name: "TEST partner",
      provider: "PARTNER_JSON",
      terms: "TEST permission to store with attribution",
      attribution: "TEST contributor",
      storageAllowed: true,
      enabled: true,
      feedUrl: "https://feed.example/places",
      syncMinutes: 1440,
      reason: "TEST source reviewed",
    });
    const rows = [
      normalizePlace({
        kind: "AREA",
        name: "TEST proposed",
        externalId: "source-1",
        sourceVersion: "1",
        address: "TEST address",
        geometry: { type: "Point", coordinates: [106.8, 10.8] },
      }),
    ];
    const stage = () =>
      db.query("select reloo_neighborhood_stage($1,$2::jsonb)", [
        src.id,
        JSON.stringify(rows),
      ]);
    await stage();
    await stage();
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from nk_place_changes where source_id=$1",
          [src.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from nk_places where source_id=$1",
          [src.id],
        )
      ).rows[0].n,
      0,
    );
    const change = (
      await db.query("select id from nk_place_changes where source_id=$1", [
        src.id,
      ])
    ).rows[0];
    await act("nk-test-admin", "ADMIN_CHANGE", {
      id: change.id,
      decision: "APPROVED",
      reason: "TEST checked location",
    });
    const location = (
      await db.query("select * from nk_places where source_id=$1", [src.id])
    ).rows[0];
    assert.equal(location.name, "TEST proposed");
    await act("nk-test-admin", "ADMIN_LOCK", {
      id: location.id,
      locked: true,
      reason: "TEST admin authoritative",
    });
    rows[0].name = "TEST unwanted change";
    rows[0].sourceVersion = "2";
    await stage();
    assert.equal(
      (await db.query("select name from nk_places where id=$1", [location.id]))
        .rows[0].name,
      "TEST proposed",
    );
    await assert.rejects(
      db.exec("update nk_audit set reason='tampered'"),
      /IMMUTABLE_RECORD/,
    );
  } finally {
    await db.close();
  }
});
test("merging a referenced building preserves bookings and snapshots and requires residency/listing review again", async () => {
  const db = await createNeighborhoodFixture(),
    { act, read, booking } = harness(db);
  try {
    const b = await booking();
    const before = (await read("nk-test-renter", "order", { id: b.id })).order;
    await act("nk-test-admin", "ADMIN_MERGE", {
      id: IDS.building,
      target: IDS.otherBuilding,
      reason: "TEST confirmed duplicate building names",
    });
    const after = (await read("nk-test-renter", "order", { id: b.id })).order;
    assert.deepEqual(after.snapshot, before.snapshot);
    assert.equal(after.handover_id, before.handover_id);
    assert.equal(
      (
        await db.query("select status from nk_places where id=$1", [
          IDS.building,
        ])
      ).rows[0].status,
      "ARCHIVED",
    );
    assert.equal(
      (
        await db.query(
          "select status from nk_listings where asset_id='nk-test-drill'",
        )
      ).rows[0].status,
      "PENDING",
    );
    assert.ok(
      (await read("nk-test-renter", "mine")).memberships.every(
        (m) => m.status === "REVERIFY",
      ),
    );
  } finally {
    await db.close();
  }
});
test("reminders reach the responsible party once per phase and older due rentals are not starved by newer non-due orders", async () => {
  const db = await createNeighborhoodFixture(),
    { act, booking } = harness(db);
  try {
    const b = await booking();
    // Synthetic queue load only; these copies do not represent booked calendars.
    await db.query(
      `insert into nk_orders select (jsonb_populate_record(null::nk_orders,
      to_jsonb(rental)||jsonb_build_object('id',gen_random_uuid(),'status','CONFIRMED','updated_at',now()))).*
      from nk_orders rental cross join generate_series(1,501) where rental.id=$1`,
      [b.id],
    );
    await db.query(
      "update nk_orders set hold_until=now()+interval '5 minutes',updated_at=now()-interval '3 days' where id=$1",
      [b.id],
    );
    await db.query("select reloo_neighborhood_maintenance()");
    const recipients = async (event) =>
      (
        await db.query(
          "select recipient_id from nk_outbox where aggregate_id=$1 and event=$2 order by recipient_id",
          [b.id, event],
        )
      ).rows.map((r) => r.recipient_id);
    assert.deepEqual(await recipients("HOLD_REMINDER"), ["nk-test-owner"]);
    await act("nk-test-owner", "ACCEPT", { id: b.id });
    const stale = (
      await db.query(
        "select id from nk_outbox where aggregate_id=$1 and event='HOLD_REMINDER'",
        [b.id],
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query(
          "select reloo_neighborhood_deliver($1,'TEST','TEST','/noi-khu',now()) r",
          [stale],
        )
      ).rows[0].r,
      "SKIPPED",
    );
    await db.query(
      "update nk_orders set hold_until=now()+interval '5 minutes' where id=$1",
      [b.id],
    );
    await db.query("select reloo_neighborhood_maintenance()");
    await db.query("select reloo_neighborhood_maintenance()");
    assert.deepEqual(await recipients("HOLD_REMINDER"), [
      "nk-test-owner",
      "nk-test-renter",
    ]);
    await db.query(
      "update nk_orders set status='ACTIVE',starts_at=now()-interval '2 hours',ends_at=now()-interval '1 minute',updated_at=now()-interval '3 days' where id=$1",
      [b.id],
    );
    await db.query("select reloo_neighborhood_maintenance()");
    await db.query("select reloo_neighborhood_maintenance()");
    assert.deepEqual(await recipients("OVERDUE"), [
      "nk-test-owner",
      "nk-test-renter",
    ]);
  } finally {
    await db.close();
  }
});
test("notification opt-out, quiet hours, daily caps and direct refund/dispute are persisted without sending real email", async () => {
  const db = await createNeighborhoodFixture(),
    { act, read, booking } = harness(db);
  try {
    const add = async (category = "match") => {
      const id = randomUUID();
      await db.query(
        "insert into nk_outbox(id,event,category,aggregate_id,recipient_id,correlation_id,dedup_key) values($1,'ITEM_MATCH',$2,'nk-test-drill','nk-test-renter',$3,$4)",
        [id, category, randomUUID(), id],
      );
      return id;
    };
    const at = new Date();
    at.setUTCDate(at.getUTCDate() + 1);
    at.setUTCHours(16, 0, 0, 0);
    const send = (id) =>
      db.query("select reloo_neighborhood_deliver($1,$2,$3,$4,$5) r", [
        id,
        "TEST message",
        "TEST body",
        "/noi-khu?tab=browse",
        at.toISOString(),
      ]);
    assert.equal((await send(await add())).rows[0].r, "SKIPPED");
    await act("nk-test-renter", "PREFERENCES", {
      locale: "vi-VN",
      match: true,
      marketing: false,
      quietStart: 22,
      quietEnd: 7,
      cap: 1,
    });
    const quiet = await add();
    assert.equal((await send(quiet)).rows[0].r, "QUIET");
    at.setUTCDate(at.getUTCDate() + 1);
    at.setUTCHours(3);
    assert.equal((await send(await add())).rows[0].r, "SENT");
    assert.equal((await send(await add())).rows[0].r, "CAPPED");
    assert.equal((await send(await add("marketing"))).rows[0].r, "SKIPPED");
    const b = await booking();
    await act("nk-test-owner", "ACCEPT", { id: b.id });
    await act("nk-test-renter", "PAYMENT_REPORT", { id: b.id });
    await act("nk-test-owner", "PAYMENT_ACK", { id: b.id });
    await act("nk-test-owner", "DEPOSIT_ACK", { id: b.id });
    await act("nk-test-renter", "CANCEL", {
      id: b.id,
      reason: "TEST cancelled before handover",
    });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.refund_status,
      "REFUND_PENDING",
    );
    await act("nk-test-owner", "REFUND_REPORT", { id: b.id });
    await act("nk-test-renter", "REFUND_ACK", { id: b.id });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.refund_status,
      "REFUNDED",
    );
    await act("nk-test-renter", "ISSUE", {
      id: b.id,
      note: "TEST disagreement over accessories",
      images: [],
    });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order
        .dispute_status,
      "DISPUTED",
    );
    await assert.rejects(
      act("nk-test-owner", "DEPOSIT_RETURN", { id: b.id }),
      /INVALID_STATE/,
    );
    await act("nk-test-admin", "RESOLVE", {
      id: b.id,
      reason: "TEST parties agreed, no automatic deduction",
    });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order
        .dispute_status,
      "RESOLVED",
    );
  } finally {
    await db.close();
  }
});
test("sandbox payment events handle success, failure, duplicates, out-of-order and late success without blind confirmation", async () => {
  const db = await createNeighborhoodFixture(),
    { act, read, booking } = harness(db);
  try {
    const b = await booking();
    await act("nk-test-owner", "ACCEPT", { id: b.id });
    const total = (await read("nk-test-renter", "order", { id: b.id })).order
      .snapshot.total;
    const pay = (event, status, seq, amount = total) =>
      db.query("select reloo_neighborhood_payment($1,$2,$3,$4,$5,$6,$7) r", [
        "SANDBOX",
        event,
        b.id,
        status,
        amount,
        seq,
        digest(event + status + seq + amount),
      ]);
    assert.equal((await pay("failed", "FAILED", 1)).rows[0].r, "APPLIED");
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.status,
      "PENDING_PAYMENT",
    );
    assert.equal((await pay("success", "PAID", 2)).rows[0].r, "APPLIED");
    assert.equal((await pay("success", "PAID", 2)).rows[0].r, "APPLIED");
    assert.equal((await pay("old", "FAILED", 1)).rows[0].r, "IGNORED");
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.status,
      "CONFIRMED",
    );
    await assert.rejects(pay("success", "FAILED", 2), /REQUEST_CONFLICT/);
    await act("nk-test-renter", "CANCEL", {
      id: b.id,
      reason: "TEST finished sandbox case",
    });
    const late = await booking();
    await act("nk-test-owner", "ACCEPT", { id: late.id });
    await db.query(
      "update nk_orders set hold_until=now()-interval '1 second' where id=$1",
      [late.id],
    );
    const r = await db.query(
      "select reloo_neighborhood_payment($1,$2,$3,$4,$5,$6,$7) r",
      ["SANDBOX", "late", late.id, "PAID", total, 1, digest("late")],
    );
    assert.equal(r.rows[0].r, "REVIEW");
    assert.equal(
      (await read("nk-test-renter", "order", { id: late.id })).order.status,
      "PENDING_PAYMENT",
    );
  } finally {
    await db.close();
  }
});
