import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createCareFixture } from "./rental-care-fixture.mjs";
import {
  classifyQuery,
  validateEvent,
  rankProducts,
} from "../lib/personalization/domain.js";
import { googleCalendar, eventKey } from "../lib/rental-care/calendar.js";
import { processRentalCalendars } from "../lib/rental-care/worker.js";
import { careTestDb } from "../lib/rental-care/test-runtime.js";
import { encryptPrivate } from "../lib/operations/crypto.js";
import { randomBytes } from "node:crypto";
import { CARE_MESSAGES, careText } from "../lib/rental-care/content.js";
test("restoring historical completed rentals cannot recreate erased recommendation interests", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter";
    await db.query("select reloo_pp_preferences($1,true,'{}',false)", [actor]);
    await db.query("select reloo_pp_clear($1,true)", [actor]);
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now()-interval '2 days',now()-interval '1 day','RETURNED')",
      [randomUUID(), actor],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_events where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      0,
    );
    const live = randomUUID();
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now()-interval '1 day',now()+interval '1 day','CONFIRMED')",
      [live, actor],
    );
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now()-interval '1 day',now()+interval '1 day','RETURNED')",
      [live, actor],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_events where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});
test("a dispute is not guessed to be a confirmation and cannot resurrect a cancelled calendar rental", async () => {
  const db = await createCareFixture();
  try {
    const id = randomUUID();
    await db.query(
      "insert into rental_agreements(id,listing_id,renter_id,lender_id,status,starts_at,ends_at) values($1,'test-vacuum','nk-test-renter','nk-test-owner','PROPOSED',now()+interval '1 day',now()+interval '2 days')",
      [id],
    );
    await db.query(
      "update rental_agreements set status='DISPUTED' where id=$1",
      [id],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from rc_rentals where rental_id=$1",
          [id],
        )
      ).rows[0].n,
      0,
    );
    await db.query(
      "update rental_agreements set status='ACCEPTED' where id=$1",
      [id],
    );
    assert.equal(
      (await db.query("select state from rc_rentals where rental_id=$1", [id]))
        .rows[0].state,
      "CONFIRMED",
    );
    await db.query(
      "update rental_agreements set status='CANCELLED' where id=$1",
      [id],
    );
    await db.query(
      "update rental_agreements set status='DISPUTED' where id=$1",
      [id],
    );
    assert.equal(
      (await db.query("select state from rc_rentals where rental_id=$1", [id]))
        .rows[0].state,
      "CANCELLED",
    );
  } finally {
    await db.close();
  }
});
test("dual destinations require an explicit policy choice and keep independent job mappings", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter",
      device = randomUUID(),
      local = randomUUID(),
      google = randomUUID();
    await db.query(
      "insert into rc_connections(id,profile_id,provider,device_id,calendar_id,status) values($1,$2,'DEVICE',$3,'LOCAL','PENDING')",
      [local, actor, device],
    );
    await db.query(
      "select reloo_rc_activate($1,$2,false,'a@example.test',true)",
      [actor, local],
    );
    await db.query(
      "insert into rc_connections(id,profile_id,provider,calendar_id,email,status) values($1,$2,'GOOGLE','APP-ONLY','a@example.test','PENDING')",
      [google, actor],
    );
    await db.query(
      "select reloo_rc_activate($1,$2,false,'a@example.test',true,true,'en-US')",
      [actor, google],
    );
    assert.equal(
      (
        await db.query(
          "select destination from rc_preferences where profile_id=$1",
          [actor],
        )
      ).rows[0].destination,
      "BOTH",
    );
    assert.equal(
      (await db.query("select status from rc_connections where id=$1", [local]))
        .rows[0].status,
      "ACTIVE",
    );
    // Only a labelled provider stub changes provisioning here; no Google API is called.
    await db.query(
      "update rc_connections set status='ACTIVE',needs_backfill=false where id=$1",
      [google],
    );
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now(),now()+interval '1 day','CONFIRMED')",
      [randomUUID(), actor],
    );
    const localJobs = (
      await db.query("select reloo_rc_claim($1,$2) job", [actor, device])
    ).rows.map((r) => r.job);
    const googleJobs = (
      await db.query("select reloo_rc_claim(null,null) job")
    ).rows.map((r) => r.job);
    assert.equal(localJobs.length, 1);
    assert.equal(googleJobs.length, 1);
    assert.notEqual(localJobs[0].connection, googleJobs[0].connection);
    assert.equal(localJobs[0].locale, "en-US");
  } finally {
    await db.close();
  }
});

test("raw-interest TTL and bilingual message coverage are real, not inferred", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter";
    const pref = (
      await db.query("select reloo_pp_preferences($1,true,'{}',false) p", [
        actor,
      ])
    ).rows[0].p;
    await db.query(
      "select reloo_pp_record($1,$2,1,$3,'VIEW','test-vacuum',null,now(),null)",
      [actor, randomUUID(), pref.epoch],
    );
    await db.query(
      "update pp_events set recorded_at=now()-interval '31 days' where profile_id=$1",
      [actor],
    );
    assert.equal(
      (await db.query("select reloo_pp_context($1) c", [actor])).rows[0].c
        .events.length,
      0,
    );
    await db.query("select reloo_pp_retention()");
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_events where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      0,
    );
    assert.deepEqual(
      Object.keys(CARE_MESSAGES["vi-VN"]).sort(),
      Object.keys(CARE_MESSAGES["en-US"]).sort(),
    );
    assert.equal(
      careText("en-US", "UNKNOWN_ERROR"),
      CARE_MESSAGES["en-US"].service,
    );
  } finally {
    await db.close();
  }
});
test("changing device calendar preserves historical mapping and reconnect reconciles returns without new copies", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter",
      device = randomUUID(),
      rental = randomUUID(),
      start = new Date().toISOString(),
      end = new Date(Date.now() + 86400000).toISOString();
    const register = async (calendar, confirm) =>
      (
        await db.query("select reloo_rc_device($1,$2,$3,'TEST local',$4) id", [
          actor,
          device,
          calendar,
          confirm,
        ])
      ).rows[0].id;
    const first = await register("local-one", false);
    await db.query(
      "select reloo_rc_activate($1,$2,false,'a@example.test',true)",
      [actor, first],
    );
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',$3,$4,'CONFIRMED')",
      [rental, actor, start, end],
    );
    const initial = (
      await db.query("select reloo_rc_claim($1,$2) job", [actor, device])
    ).rows[0].job;
    await db.query(
      "select reloo_rc_ack($1,$2,$3,$4,'original-event','SYNCED')",
      [actor, initial.id, initial.lease, initial.revision],
    );
    await assert.rejects(
      register("local-two", false),
      /DESTINATION_CONFIRMATION_REQUIRED/,
    );
    const second = await register("local-two", true);
    assert.notEqual(second, first);
    await db.query(
      "select reloo_rc_activate($1,$2,false,'a@example.test',true)",
      [actor, second],
    );
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',$3,$4,'RETURNED')",
      [rental, actor, start, end],
    );
    const restored = await register("local-one", true);
    assert.equal(restored, first);
    await db.query(
      "select reloo_rc_activate($1,$2,false,'a@example.test',true)",
      [actor, restored],
    );
    const returned = (
      await db.query("select reloo_rc_claim($1,$2) job", [actor, device])
    ).rows[0].job;
    assert.equal(returned.state, "RETURNED");
    assert.equal(returned.remoteId, "original-event");
    assert.equal(returned.connection, first);
  } finally {
    await db.close();
  }
});
test("deleted Google targets and expired permission never become a fabricated sync receipt", async () => {
  const job = {
    connection: randomUUID(),
    source: "AGREEMENT",
    rental: randomUUID(),
    revision: 1,
    calendar: "missing",
    state: "CONFIRMED",
    end: new Date(Date.now() + 86400000).toISOString(),
  };
  await assert.rejects(
    googleCalendar({
      fetcher: async () => new Response("{}", { status: 404 }),
    }).sync("TEST", job),
    /CALENDAR_REVIEW/,
  );
  await assert.rejects(
    googleCalendar({
      fetcher: async () => new Response("{}", { status: 401 }),
    }).sync("TEST", job),
    /REAUTH/,
  );
});
test("safe topic classification, non-sensitive events and explainable adaptive ranking", () => {
  assert.equal(classifyQuery("máy hút bụi").topic, "VACUUM");
  assert.equal(classifyQuery("0901234567 cần máy hút bụi"), null);
  assert.equal(classifyQuery("email@example.com"), null);
  assert.throws(() =>
    validateEvent({
      id: randomUUID(),
      version: 1,
      epoch: 1,
      kind: "COMPLETED",
      at: new Date().toISOString(),
    }),
  );
  assert.throws(() =>
    validateEvent({
      id: randomUUID(),
      version: 1,
      epoch: 1,
      kind: "VIEW",
      at: new Date().toISOString(),
      latitude: 10,
    }),
  );
  const items = [
    {
      id: "camera",
      category: "may-anh",
      ownerId: "a",
      title: "Máy ảnh",
      dailyPrice: 120000,
    },
    {
      id: "vacuum",
      category: "gia-dung",
      ownerId: "b",
      title: "Máy hút bụi",
      dailyPrice: 50000,
    },
  ];
  const context = {
    enabled: true,
    config: { weights: { SEARCH: 1.4 } },
    events: [0, 1, 2].map((i) => ({
      kind: "SEARCH",
      category: "gia-dung",
      topic: "VACUUM",
      recorded_at: new Date(Date.now() - i * 86400000).toISOString(),
    })),
  };
  assert.equal(rankProducts(items, context).items[0].id, "vacuum");
  assert.equal(
    rankProducts(items, { ...context, enabled: false }).items[0].reason,
    "explore",
  );
  assert.equal(
    rankProducts(items, {
      enabled: true,
      config: { weights: { VIEW: 0.2 } },
      events: [
        {
          kind: "VIEW",
          category: "gia-dung",
          recorded_at: new Date().toISOString(),
        },
      ],
    }).items.find((i) => i.id === "vacuum").reason,
    "explore",
  );
});
test("persisted consent, deduplication, reset epochs, blocks and backend candidate eligibility", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter";
    const call = async (sql, args = []) =>
      (await db.query(sql, args)).rows[0]?.r;
    assert.equal(
      (await call("select reloo_pp_context($1) r", [actor])).enabled,
      false,
    );
    const p = await call("select reloo_pp_preferences($1,true,$2,false) r", [
      actor,
      [],
    ]);
    const record = (id = randomUUID(), epoch = p.epoch) =>
      call(
        "select reloo_pp_record($1,$2,1,$3,'SEARCH',null,'gia-dung',now(),'VACUUM') r",
        [actor, id, epoch],
      );
    const id = randomUUID();
    assert.equal(await record(id), "RECORDED");
    assert.equal(await record(id), "DUPLICATE");
    assert.equal(await record(), "DUPLICATE");
    await call("select reloo_pp_preferences($1,false,$2,false) r", [actor, []]);
    assert.equal(await record(), "NO_CONSENT");
    assert.equal(
      (await call("select reloo_pp_context($1) r", [actor])).events.length,
      0,
    );
    await call("select reloo_pp_preferences($1,true,$2,true) r", [actor, []]);
    assert.equal(await record(), "NO_CONSENT");
    await call("select reloo_pp_exclude($1,'OWNER','nk-test-owner',true)", [
      actor,
    ]);
    const rows = (
      await db.query("select reloo_pp_candidates($1,$2) r", [
        actor,
        ["test-vacuum", "test-cleaner"],
      ])
    ).rows.map((r) => r.r);
    assert.deepEqual(
      rows.map((r) => r.id),
      ["test-cleaner"],
    );
    assert.equal(
      (await call("select reloo_pp_context('nk-test-renter2') r")).enabled,
      false,
    );
    assert.equal(
      (
        await db.query(
          "select has_table_privilege('anon','pp_events','SELECT') ok",
        )
      ).rows[0].ok,
      false,
    );
  } finally {
    await db.close();
  }
});
test("calendar consent creates subsequent rental jobs, revisions and leased idempotent receipts", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter",
      connection = randomUUID(),
      device = randomUUID();
    await db.query(
      "insert into rc_connections(id,profile_id,provider,device_id,calendar_id,status,email) values($1,$2,'DEVICE',$3,'local-test','PENDING',null)",
      [connection, actor, device],
    );
    await db.query(
      "select reloo_rc_activate($1,$2,false,'registered@example.test',true)",
      [actor, connection],
    );
    const id = randomUUID();
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now(),now()+interval '1 day','CONFIRMED')",
      [id, actor],
    );
    const jobs = await db.query("select reloo_rc_claim($1,$2) job", [
      actor,
      device,
    ]);
    assert.equal(jobs.rows.length, 1);
    const job = jobs.rows[0].job;
    assert.equal(
      (await db.query("select reloo_rc_claim($1,$2) job", [actor, device])).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query(
        "select reloo_rc_ack('nk-test-renter2',$1,$2,1,'local-1','SYNCED')",
        [job.id, job.lease],
      ),
      /FORBIDDEN/,
    );
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now(),now()+interval '2 days','CONFIRMED')",
      [id, actor],
    );
    await db.query("select reloo_rc_ack($1,$2,$3,1,'local-1','SYNCED')", [
      actor,
      job.id,
      job.lease,
    ]);
    const changed = (
      await db.query("select reloo_rc_claim($1,$2) job", [actor, device])
    ).rows[0].job;
    assert.equal(changed.revision, 2);
    assert.equal(changed.remoteId, "local-1");
    await db.query("select reloo_rc_ack($1,$2,$3,2,'local-1','SYNCED')", [
      actor,
      changed.id,
      changed.lease,
    ]);
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now(),now()+interval '2 days','RETURNED')",
      [id, actor],
    );
    assert.equal(
      (await db.query("select reloo_rc_claim($1,$2) job", [actor, device]))
        .rows[0].job.state,
      "RETURNED",
    );
    assert.equal(
      (
        await db.query(
          "select has_table_privilege('authenticated','rc_connections','SELECT') ok",
        )
      ).rows[0].ok,
      false,
    );
  } finally {
    await db.close();
  }
});
test("Google adapter fake transport: deterministic retry, ownership guard and no personal-event listing", async () => {
  const events = new Map(),
    calls = [],
    job = {
      connection: randomUUID(),
      source: "NEIGHBORHOOD",
      rental: randomUUID(),
      revision: 1,
      calendar: "app-calendar",
      end: new Date(Date.now() + 86400000).toISOString(),
      state: "CONFIRMED",
      returnAction: "KEEP",
    };
  const fetcher = async (url, options = {}) => {
    calls.push({ url, method: options.method });
    const id = url.split("/").pop();
    if (options.method === "POST") {
      const body = JSON.parse(options.body);
      if (events.has(body.id)) return new Response("{}", { status: 409 });
      events.set(body.id, body);
      return Response.json(body);
    }
    if (options.method === "PATCH") {
      events.set(id, { ...events.get(id), ...JSON.parse(options.body) });
      return Response.json(events.get(id));
    }
    if (options.method === "DELETE") {
      events.delete(id);
      return new Response(null, { status: 204 });
    }
    return events.has(id)
      ? Response.json(events.get(id))
      : new Response("{}", { status: 404 });
  };
  const provider = googleCalendar({ fetcher });
  await provider.sync("TEST-token", job);
  await provider.sync("TEST-token", job);
  assert.equal(events.size, 1);
  assert.equal(events.get(eventKey(job)).reminders.overrides.length, 2);
  await provider.sync("TEST-token", { ...job, state: "RETURNED", revision: 2 });
  assert.equal(events.get(eventKey(job)).reminders.overrides.length, 0);
  await provider.sync("TEST-token", {
    ...job,
    state: "CANCELLED",
    revision: 3,
  });
  assert.equal(events.size, 0);
  events.set(eventKey(job), {
    extendedProperties: { private: { relooKey: "unrelated-personal-event" } },
  });
  await assert.rejects(provider.sync("TEST-token", job), /CALENDAR_REVIEW/);
  assert.ok(!calls.some((c) => /gmail|events\?/.test(c.url)));
});

test("different Google account requires acknowledgement and choosing Google pauses device writes", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter",
      device = randomUUID(),
      google = randomUUID();
    await db.query(
      "insert into rc_connections(id,profile_id,provider,device_id,calendar_id,status) values($1,$2,'DEVICE',$3,'local','PENDING')",
      [device, actor, randomUUID()],
    );
    await db.query(
      "select reloo_rc_activate($1,$2,false,'registered@example.test',true)",
      [actor, device],
    );
    await db.query(
      "insert into rc_connections(id,profile_id,provider,email,status) values($1,$2,'GOOGLE','other@example.test','PENDING')",
      [google, actor],
    );
    await assert.rejects(
      db.query(
        "select reloo_rc_activate($1,$2,false,'registered@example.test',true)",
        [actor, google],
      ),
      /ACCOUNT_CONFIRMATION_REQUIRED/,
    );
    await db.query(
      "select reloo_rc_activate($1,$2,true,'registered@example.test',true)",
      [actor, google],
    );
    assert.equal(
      (
        await db.query("select status from rc_connections where id=$1", [
          device,
        ])
      ).rows[0].status,
      "PAUSED",
    );
    assert.equal(
      (
        await db.query(
          "select destination from rc_preferences where profile_id=$1",
          [actor],
        )
      ).rows[0].destination,
      "GOOGLE",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from rc_connections where profile_id=$1 and status='ACTIVE'",
          [actor],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
test("worker reconciles uncertain calendar creation without creating another copy and revocation never reports success", async () => {
  const before = process.env.RELOO_PRIVATE_DATA_KEY;
  process.env.RELOO_PRIVATE_DATA_KEY = randomBytes(32).toString("hex");
  const db = await createCareFixture();
  try {
    const id = randomUUID(),
      actor = "nk-test-renter";
    await db.query(
      "insert into rc_connections(id,profile_id,provider,status,credentials_encrypted) values($1,$2,'GOOGLE','PROVISIONING',$3)",
      [
        id,
        actor,
        encryptPrivate(JSON.stringify({ refresh_token: "TEST_ONLY" })),
      ],
    );
    await db.query(
      "insert into rc_preferences(profile_id,destination) values($1,'GOOGLE')",
      [actor],
    );
    let creates = 0;
    const provider = {
      findCalendar: async () => null,
      createCalendar: async () => {
        creates++;
        throw Error("timeout");
      },
      sync: async () => {
        throw Error("REAUTH");
      },
    };
    await processRentalCalendars(careTestDb(db), {
      provider,
      refresh: async () => "TEST",
    });
    assert.equal(
      (await db.query("select status from rc_connections where id=$1", [id]))
        .rows[0].status,
      "REVIEW",
    );
    await db.query(
      "update rc_connections set status='PROVISIONING',lease_until=null where id=$1",
      [id],
    );
    await processRentalCalendars(careTestDb(db), {
      provider,
      refresh: async () => "TEST",
    });
    assert.equal(creates, 1);
    provider.findCalendar = async () => ({ id: "recovered-app-calendar" });
    await db.query(
      "update rc_connections set status='PROVISIONING',lease_until=null where id=$1",
      [id],
    );
    await processRentalCalendars(careTestDb(db), {
      provider,
      refresh: async () => "TEST",
    });
    await db.query(
      "select rc_queue_rental('AGREEMENT',$1,$2,'test-vacuum',now(),now()+interval '1 day','CONFIRMED')",
      [randomUUID(), actor],
    );
    await processRentalCalendars(careTestDb(db), {
      provider,
      refresh: async () => "TEST",
    });
    assert.equal(
      (await db.query("select status from rc_connections where id=$1", [id]))
        .rows[0].status,
      "REAUTH",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from rc_calendar_events where status='SYNCED'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
    if (before === undefined) delete process.env.RELOO_PRIVATE_DATA_KEY;
    else process.env.RELOO_PRIVATE_DATA_KEY = before;
  }
});
test("history clearing, explicit hides, TTL and account deletion cannot rebuild erased interests", async () => {
  const db = await createCareFixture();
  try {
    const actor = "nk-test-renter";
    const pref = (
      await db.query(
        "select reloo_pp_preferences($1,true,array['gia-dung'],false) p",
        [actor],
      )
    ).rows[0].p;
    await db.query(
      "select reloo_pp_record($1,$2,1,$3,'VIEW','test-vacuum',null,now(),null)",
      [actor, randomUUID(), pref.epoch],
    );
    await db.query("select reloo_pp_exclude($1,'PRODUCT','test-vacuum',true)", [
      actor,
    ]);
    await db.query("select reloo_pp_clear($1,false)", [actor]);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_events where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_exclusions where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      1,
    );
    await db.query("select reloo_pp_preferences($1,false,'{}',false)", [actor]);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_exclusions where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      1,
    );
    await db.query("update profiles set deleted_at=now() where id=$1", [actor]);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from pp_exclusions where profile_id=$1",
          [actor],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select enabled from pp_preferences where profile_id=$1",
          [actor],
        )
      ).rows[0].enabled,
      false,
    );
  } finally {
    await db.close();
  }
});
