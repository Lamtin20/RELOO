import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createNeighborhoodFixture, IDS } from "./neighborhood-fixture.mjs";
import {
  isoLocal,
  quote,
  locationSuggestions,
  validateGeometry,
  contains,
  matchRank,
} from "../lib/neighborhood/domain.js";
import { MESSAGES, POPUPS, EVENTS } from "../lib/neighborhood/content.js";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const start = new Date(Date.now() + 2 * 86400000).toISOString(),
  end = new Date(Date.now() + 3 * 86400000).toISOString();
test("Vietnam time, integer quote, explicit geography suggestions and bilingual registries", () => {
  assert.equal(isoLocal("2026-10-18T18:00"), "2026-10-18T11:00:00.000Z");
  assert.throws(() => isoLocal("2026-02-30T18:00"));
  assert.deepEqual(
    quote(
      {
        rate: 10000,
        deposit: 50000,
        unitMinutes: 60,
        minMinutes: 60,
        feeBps: 100,
        version: 1,
      },
      "2026-10-18T11:00Z",
      "2026-10-18T12:01Z",
    ),
    {
      units: 2,
      rent: 20000,
      fee: 200,
      deposit: 50000,
      total: 70200,
      policyVersion: 1,
    },
  );
  const geometry = validateGeometry({
    type: "Polygon",
    coordinates: [
      [
        [106, 10],
        [107, 10],
        [107, 11],
        [106, 11],
        [106, 10],
      ],
    ],
  });
  assert.ok(contains(geometry, [106.5, 10.5]));
  const suggestions = locationSuggestions(
    [
      { id: "a", geometry },
      { id: "b", geometry: { type: "Point", coordinates: [106.5, 10.5] } },
    ],
    { lat: 10.5, lng: 106.5, accuracy: 500 },
  );
  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((s) => s.requiresConfirmation));
  assert.equal(suggestions[1].estimated, true);
  assert.equal(matchRank({ building_id: "b" }, { buildingId: "b" }), 0);
  assert.throws(() => validateGeometry({ type: "Point", coordinates: [0, 0] }));
  assert.deepEqual(
    Object.keys(MESSAGES["vi-VN"]).sort(),
    Object.keys(MESSAGES["en-US"]).sort(),
  );
  assert.ok(Object.keys(POPUPS).length >= 15);
  assert.ok(Object.keys(EVENTS).length >= 24);
});
test("persisted neighborhood workflow, authorization, calendar conflicts, OTP, returns, outbox and stale links", async () => {
  const db = await createNeighborhoodFixture();
  const act = async (actor, action, data, key = randomUUID()) =>
    (
      await db.query(
        "select reloo_neighborhood_action($1,$2,$3,$4::jsonb) result",
        [actor, key, action, JSON.stringify(data)],
      )
    ).rows[0].result;
  const read = async (actor, section, filter = {}) =>
    (
      await db.query("select reloo_neighborhood_read($1,$2,$3::jsonb) result", [
        actor,
        section,
        JSON.stringify(filter),
      ])
    ).rows[0].result;
  const book = async (actor, key = randomUUID()) => {
    const q = (
      await read(actor, "quote", {
        area: IDS.area,
        asset: "nk-test-drill",
        start,
        end,
      })
    ).quote;
    return act(
      actor,
      "BOOK",
      {
        asset: "nk-test-drill",
        start,
        end,
        policyVersion: q.policyVersion,
        listingVersion: q.listingVersion,
        total: q.total,
        agreed: true,
      },
      key,
    );
  };
  try {
    const catalog = await read(null, "catalog");
    assert.equal(catalog.places.length, 4);
    assert.ok(!JSON.stringify(catalog).includes(IDS.point));
    assert.equal(
      (await read("nk-test-renter", "search", { area: IDS.area, start, end }))
        .items.length,
      1,
    );
    await assert.rejects(book("nk-test-visitor"), /IDENTITY_REQUIRED/);
    const key = randomUUID(),
      b = await book("nk-test-renter", key);
    const q = (await read("nk-test-renter", "order", { id: b.id })).order
      .snapshot;
    assert.equal(
      (
        await act(
          "nk-test-renter",
          "BOOK",
          {
            asset: "nk-test-drill",
            start,
            end,
            policyVersion: q.policyVersion,
            listingVersion: q.listingVersion,
            total: q.total,
            agreed: true,
          },
          key,
        )
      ).id,
      b.id,
    );
    await assert.rejects(
      act("nk-test-renter", "BOOK", { asset: "changed" }, key),
      /REQUEST_CONFLICT/,
    );
    await assert.rejects(book("nk-test-renter2"), /SLOT_CONFLICT/);
    await assert.rejects(
      read("nk-test-visitor", "order", { id: b.id }),
      /NOT_FOUND/,
    );
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).handover,
      null,
    );
    await assert.rejects(
      act("nk-test-renter", "ACCEPT", { id: b.id }),
      /INVALID_STATE/,
    );
    await act("nk-test-owner", "ACCEPT", { id: b.id });
    await act("nk-test-renter", "PAYMENT_REPORT", { id: b.id });
    await act("nk-test-owner", "PAYMENT_ACK", { id: b.id });
    await act("nk-test-owner", "DEPOSIT_ACK", { id: b.id });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.status,
      "CONFIRMED",
    );
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).handover.id,
      IDS.point,
    );
    await act("nk-test-owner", "READY", { id: b.id });
    const issue = () =>
      act("nk-test-owner", "ISSUE_OTP", {
        id: b.id,
        phase: "PICKUP",
        codeHash: hash("123456"),
      });
    await issue();
    const check = {
      id: b.id,
      phase: "PICKUP",
      checked: true,
      checklist: q.accessories,
      images: ["/api/media/10000000-0000-4000-8000-000000000009"],
      condition: "TEST checked",
    };
    await assert.rejects(
      act("nk-test-renter", "HANDOVER", { ...check, checked: false }),
      /CHECKLIST_REQUIRED/,
    );
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await act("nk-test-renter", "HANDOVER", {
            ...check,
            codeHash: hash("000000"),
          })
        ).error,
        "OTP_INVALID",
      );
    assert.equal(
      (
        await act("nk-test-renter", "HANDOVER", {
          ...check,
          codeHash: hash("123456"),
        })
      ).error,
      "OTP_LOCKED",
    );
    await db.exec(
      "update nk_handover_codes set attempts=0,expires_at=now()-interval '1 minute'",
    );
    assert.equal(
      (
        await act("nk-test-renter", "HANDOVER", {
          ...check,
          codeHash: hash("123456"),
        })
      ).error,
      "OTP_INVALID",
    );
    await db.exec(
      "update nk_handover_codes set expires_at=now()+interval '5 minutes'",
    );
    await act("nk-test-owner", "HANDOVER", { ...check });
    await act("nk-test-renter", "HANDOVER", {
      ...check,
      codeHash: hash("123456"),
    });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.status,
      "ACTIVE",
    );
    await assert.rejects(
      act("nk-test-renter", "HANDOVER", { ...check, codeHash: hash("123456") }),
      /INVALID_STATE/,
    );
    const extended = new Date(Date.parse(end) + 86400000).toISOString(),
      extension = await act("nk-test-renter", "EXTEND", {
        id: b.id,
        end: extended,
      });
    await act("nk-test-owner", "EXTENSION_ACCEPT", {
      id: b.id,
      extension: extension.extensionId,
    });
    assert.equal(
      Date.parse(
        (await read("nk-test-renter", "order", { id: b.id })).order.ends_at,
      ),
      Date.parse(end),
    );
    await act("nk-test-owner", "EXTENSION_PAID", {
      id: b.id,
      extension: extension.extensionId,
    });
    assert.equal(
      Date.parse(
        (await read("nk-test-renter", "order", { id: b.id })).order.ends_at,
      ),
      Date.parse(extended),
    );
    await act("nk-test-renter", "REQUEST_RETURN", { id: b.id });
    await act("nk-test-renter", "ISSUE_OTP", {
      id: b.id,
      phase: "RETURN",
      codeHash: hash("654321"),
    });
    const back = { ...check, phase: "RETURN" };
    await act("nk-test-renter", "HANDOVER", back);
    await act("nk-test-owner", "HANDOVER", {
      ...back,
      codeHash: hash("654321"),
    });
    await act("nk-test-owner", "DEPOSIT_RETURN", { id: b.id });
    await act("nk-test-renter", "DEPOSIT_RETURN_ACK", { id: b.id });
    assert.equal(
      (await read("nk-test-renter", "order", { id: b.id })).order.status,
      "COMPLETED",
    );
    await act("nk-test-renter", "REVIEW", {
      id: b.id,
      rating: 5,
      note: "TEST review",
    });
    const event = (
      await db.query(
        "select id from nk_outbox where event='REVIEW_INVITED' limit 1",
      )
    ).rows[0];
    const deliver = () =>
      db.query("select reloo_neighborhood_deliver($1,$2,$3,$4) result", [
        event.id,
        "TEST title",
        "TEST body",
        "/noi-khu?order=" + b.id,
      ]);
    assert.equal((await deliver()).rows[0].result, "SENT");
    assert.equal((await deliver()).rows[0].result, "NOT_DUE");
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from notifications where id='nk_'||$1",
          [event.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select count(*)::int n from email_delivery_log")).rows[0]
        .n,
      0,
    );
    await assert.rejects(
      db.exec("set role anon;select * from nk_orders"),
      /permission denied/,
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
