import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  CAPTURE_POSES,
  validCaptureManifest,
  facePose,
} from "../lib/kyc/capture.js";
import {
  paymentReference,
  withdrawalReference,
} from "../lib/finance/payment-reference.js";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
create table profiles(id text primary key,auth_user_id uuid,email text,name text,phone text,avatar_url text,profile_data jsonb default '{}',kyc_level text,status text default 'active',activation_status text default 'ACTIVE',phone_screening_status text,screening_valid_until timestamptz default now()+interval '1 year');
insert into profiles(id,email,name,phone,kyc_level) values('alice','alice@example.invalid','Alice','0900000001','L2'),('bob','bob@example.invalid','Bob','0900000002','L2'),('admin','admin@example.invalid','Admin','0900000003','L2');
create function reloo_normalize_phone(v text) returns text language sql as $$select v$$;
create table crm_staff(profile_id text primary key,enabled boolean);insert into crm_staff values('admin',true);
create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select actor='admin'$$;
create table security_audit(id bigserial,actor_id text,subject_id text,action text,details jsonb);
create table risk_cases(profile_id text,status text);create table risk_blacklist(profile_id text,status text,expires_at timestamptz);
create table risk_identifiers(profile_id text,value_encrypted text,masked_value text,source_results jsonb);
create table business_settings(id boolean primary key,deposit jsonb);insert into business_settings values(true,'{"enabled":true}');
create table brand_settings(id boolean primary key,rental_payments_enabled boolean);insert into brand_settings values(true,true);
create table assets(id text primary key,owner_id text,status text);create table short_videos(id uuid,profile_id text,status text);
create table rental_agreements(id uuid primary key default gen_random_uuid(),renter_id text,lender_id text,status text,rent_amount bigint,ends_at timestamptz);
create table transactions(id uuid primary key default gen_random_uuid(),renter_id text,lender_id text,status text);
create table kyc_photo_sessions(id uuid primary key default gen_random_uuid(),profile_id text,issued_at timestamptz default now(),expires_at timestamptz default now()+interval '15 minutes',consumed_at timestamptz,capture_version integer default 2);
create table kyc_challenges(id uuid primary key,profile_id text);
create table kyc_submissions(id uuid primary key default gen_random_uuid(),profile_id text,national_id_encrypted text,national_id_hash text,extracted_encrypted text,document_paths jsonb,face_result jsonb,checks jsonb,declared_expiry date,reason text,status text,photo_session_id uuid,challenge_id uuid,expires_at timestamptz not null default now()+interval '30 days');
create table verified_identities(profile_id text,expires_at timestamptz);insert into verified_identities values('alice',now()+interval '1 year'),('bob',now()+interval '1 year');
create table profile_bank_accounts(id uuid primary key default gen_random_uuid(),profile_id text,name_status text,bank_name text,masked_account text,account_encrypted text,account_hash text,holder_encrypted text);
create table account_access_devices(profile_id text);create table automation_jobs(id uuid default gen_random_uuid(),kind text,payload jsonb);
create table affiliate_clicks(id text primary key,profile_id text,merchant text);create table cashback_conversions(id text primary key,click_id text,provider_order_id text,merchant text,status text,reward bigint,provider_updated_at timestamptz,created_at timestamptz);create table cashback_ledger(id uuid,profile_id text,conversion_id text,amount bigint,event_type text,created_at timestamptz);
`);
  for (const name of [
    "finance",
    "cashflow",
    "wallet-display",
    "payout-requests",
    "identity-retention",
    "rental-payments",
    "payout-out-attribution",
  ])
    await db.exec(
      await readFile(
        new URL("../deploy/vietnam/" + name + ".sql", import.meta.url),
        "utf8",
      ),
    );
  return db;
}
async function source(db, amount, profile, direction = "IN") {
  const inbox = (
    await db.query(
      "insert into finance_webhook_inbox(provider_event_id,body_hash,payload_encrypted) values(gen_random_uuid(),'fixture','fixture') returning id",
    )
  ).rows[0].id;
  const s = (
    await db.query(
      "insert into finance_sources(provider,provider_id,bank_account_id,direction,amount,reference_hash,occurred_at,evidence_encrypted,evidence_envelope,evidence_hash,signature,signing_key_id,inbox_id) values('SEPAY',gen_random_uuid(),'bank',$3,$1,'fixture',clock_timestamp(),'fixture','{}','fixture','fixture','fixture',$2) returning *",
      [amount, inbox, direction],
    )
  ).rows[0];
  if (profile)
    s.entry = (
      await db.query(
        "insert into customer_cash_entries(profile_id,source_id,direction,amount,reference,occurred_at) values($1,$2,$5,$3,'fixture',$4) returning id",
        [profile, s.id, amount, s.occurred_at, direction],
      )
    ).rows[0].id;
  return s;
}
test("camera manifest rejects stale, replayed, reordered, incomplete and foreign sessions; face guidance requires one usable face", () => {
  const now = Date.now(),
    session = {
      profile_id: "alice",
      issued_at: new Date(now - 10000).toISOString(),
      expires_at: new Date(now + 60000).toISOString(),
      capture_version: 2,
    },
    m = {
      version: 2,
      source: "LIVE_CAMERA",
      hashes: {
        front: "a".repeat(64),
        back: "b".repeat(64),
        selfie: "c".repeat(64),
      },
      poses: CAPTURE_POSES.map((pose, i) => ({
        pose,
        at: now - 8000 + i * 1200,
      })),
    };
  assert.equal(validCaptureManifest(m, session, "alice", now), true);
  for (const s of [
    { ...session, consumed_at: new Date().toISOString() },
    { ...session, expires_at: "invalid" },
    { ...session, expires_at: new Date(now - 1).toISOString() },
    { ...session, capture_version: 1 },
  ])
    assert.equal(validCaptureManifest(m, s, "alice", now), false);
  assert.equal(validCaptureManifest(m, session, "bob", now), false);
  assert.equal(
    validCaptureManifest(
      { ...m, poses: m.poses.toReversed() },
      session,
      "alice",
      now,
    ),
    false,
  );
  assert.equal(
    validCaptureManifest(
      { ...m, hashes: { front: m.hashes.front } },
      session,
      "alice",
      now,
    ),
    false,
  );
  assert.equal(facePose([]), null);
  const landmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
  landmarks[234].x = 0.3;
  landmarks[454].x = 0.7;
  assert.equal(facePose(landmarks).pose, "STRAIGHT");
  landmarks[1].x = 0.58;
  assert.equal(facePose(landmarks).pose, "LEFT");
  landmarks[1].x = 0.42;
  assert.equal(facePose(landmarks).pose, "RIGHT");
});
test("payment reference accepts a single complete reference and rejects ambiguous or truncated content", () => {
  const ref = "RELOO" + "A".repeat(32);
  assert.equal(paymentReference("Thanh toan " + ref), ref);
  for (const text of [ref + "0", "X" + ref, ref.slice(0, -1), ref + " " + ref])
    assert.equal(paymentReference(text), null);
});
test("account deletion rejects open and overdue contracts, pending payments and active VA; eligible deletion scrubs identity and queues its three private files", async () => {
  const db = await setup();
  try {
    await db.exec(
      "insert into rental_agreements(renter_id,lender_id,status,ends_at) values('alice','bob','ACTIVE',now()-interval '1 month');",
    );
    assert.equal(
      (await db.query("select reloo_deletion_eligibility('alice') v")).rows[0].v
        .allowed,
      false,
    );
    await assert.rejects(
      db.query("select reloo_request_account_deletion('alice')"),
      /UNRESOLVED/,
    );
    await db.exec(
      "update rental_agreements set status='CLOSED';insert into transactions(renter_id,lender_id,status) values('alice','bob','pending');",
    );
    await assert.rejects(
      db.query("select reloo_request_account_deletion('alice')"),
      /UNRESOLVED/,
    );
    await db.exec("update transactions set status='completed'");
    await db.exec(
      "insert into customer_va_links(profile_id,bank_account_id,va_encrypted,va_hash,masked_va,bank_name) values('alice','bank','private','active-va','***','VCB')",
    );
    await assert.rejects(
      db.query("select reloo_request_account_deletion('alice')"),
      /UNRESOLVED/,
    );
    await db.exec("update customer_va_links set status='INACTIVE'");
    const id = "00000000-0000-4000-8000-000000000011";
    await db.query(
      "insert into kyc_submissions(id,profile_id,national_id_encrypted,national_id_hash,document_paths,status) values($1,'alice','private','hash',$2,'APPROVED')",
      [
        id,
        {
          front: id + "-front.enc",
          back: id + "-back.enc",
          selfie: id + "-selfie.enc",
        },
      ],
    );
    assert.equal(
      (await db.query("select expires_at from kyc_submissions")).rows[0]
        .expires_at,
      null,
    );
    await db.exec(
      "insert into profile_bank_accounts(profile_id) values('alice');insert into assets values('asset','alice','available');create trigger asset_gate before update on assets for each row execute function reloo_asset_gate();",
    );
    const deletion = (
      await db.query("select reloo_request_account_deletion('alice') id")
    ).rows[0].id;
    const evidence = (
      await db.query(
        "select evidence_paths from account_deletion_requests where id=$1",
        [deletion],
      )
    ).rows[0].evidence_paths;
    assert.equal(evidence.length, 3);
    assert.equal(
      (await db.query("select national_id_encrypted from kyc_submissions"))
        .rows[0].national_id_encrypted,
      "",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from verified_identities where profile_id='alice'",
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select status from assets")).rows[0].status,
      "removed",
    );
    await assert.rejects(
      db.query("select reloo_assert_active('alice')"),
      /ACCOUNT_RESTRICTED/,
    );
    assert.equal(
      (await db.query("select reloo_request_account_deletion('alice') id"))
        .rows[0].id,
      deletion,
    );
    await db.query("select reloo_finish_account_deletion($1)", [deletion]);
    assert.deepEqual(
      (await db.query("select evidence_paths from account_deletion_requests"))
        .rows[0].evidence_paths,
      [],
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select reloo_request_account_deletion('bob')"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("VA payments bind payer, agreement, exact amount and source once; wrong amount requires review and replay after closure stays idempotent", async () => {
  const db = await setup();
  try {
    const rental = (
      await db.query(
        "insert into rental_agreements(renter_id,lender_id,status,rent_amount) values('alice','bob','ACCEPTED',100000) returning id",
      )
    ).rows[0].id;
    const va = (
      await db.query(
        "insert into customer_va_links(profile_id,bank_account_id,provider_va_id,va_encrypted,va_hash,masked_va,bank_name) values('alice','bank',gen_random_uuid(),'private','hash','***','VCB') returning id",
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select reloo_create_payment_intent($1,$2,$3)", [
        "bob",
        rental,
        va,
      ]),
      /PAYMENT_NOT_ENABLED/,
    );
    const intent = (
      await db.query("select reloo_create_payment_intent($1,$2,$3) id", [
        "alice",
        rental,
        va,
      ])
    ).rows[0].id;
    assert.equal(
      (
        await db.query("select reloo_create_payment_intent($1,$2,$3) id", [
          "alice",
          rental,
          va,
        ])
      ).rows[0].id,
      intent,
    );
    const reference = (
      await db.query("select reference from rental_payment_intents")
    ).rows[0].reference;
    const fund = await source(db, 100000);
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,$2,$3) result",
          [fund.id, "bob", reference],
        )
      ).rows[0].result,
      false,
    );
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,$2,$3) result",
          [fund.id, "alice", reference],
        )
      ).rows[0].result,
      true,
    );
    await db.exec("update rental_agreements set status='CLOSED'");
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,$2,$3) result",
          [fund.id, "alice", reference],
        )
      ).rows[0].result,
      true,
    );
    assert.equal(
      (await db.query("select count(*)::int n from customer_cash_entries"))
        .rows[0].n,
      1,
    );
    const a = (await db.query("select * from rental_payment_allocations"))
      .rows[0];
    assert.equal(a.profile_id, "bob");
    assert.equal(a.debit, a.credit);
    await assert.rejects(
      db.query("update rental_payment_allocations set debit=1"),
      /IMMUTABLE/,
    );
    const extra = await source(db, 100000);
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,$2,$3) result",
          [extra.id, "alice", reference],
        )
      ).rows[0].result,
      false,
    );
    assert.equal(
      (await db.query("select count(*)::int n from customer_cash_entries"))
        .rows[0].n,
      1,
    );
    const rental2 = (
      await db.query(
        "insert into rental_agreements(renter_id,lender_id,status,rent_amount) values('alice','bob','ACCEPTED',100000) returning id",
      )
    ).rows[0].id;
    await db.query("select reloo_create_payment_intent($1,$2,$3)", [
      "alice",
      rental2,
      va,
    ]);
    const ref2 = (
      await db.query(
        "select reference from rental_payment_intents where agreement_id=$1",
        [rental2],
      )
    ).rows[0].reference;
    const wrong = await source(db, 90000);
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,$2,$3) result",
          [wrong.id, "alice", ref2],
        )
      ).rows[0].result,
      false,
    );
    assert.equal(
      (
        await db.query(
          "select status from rental_payment_intents where agreement_id=$1",
          [rental2],
        )
      ).rows[0].status,
      "REVIEW",
    );
  } finally {
    await db.close();
  }
});
test("outbound bank evidence without VA links only to the exact payout reference, amount and bank; attribution alone never marks paid", async () => {
  const db = await setup();
  try {
    const f = await source(db, 100000, "alice");
    await db.query(
      "select reloo_release_payout('admin','alice','BANK',100000,$1,'Chứng từ cấp quyền chi trả đã được kiểm tra')",
      [f.id],
    );
    const bank = (
      await db.query(
        "insert into profile_bank_accounts(profile_id,name_status,bank_name,masked_account,account_encrypted,account_hash,holder_encrypted) values('alice','DECLARED_NAME_MATCH','VCB','***','private','hash','holder') returning id",
      )
    ).rows[0].id;
    const id = (
      await db.query(
        "select reloo_request_payout('alice','BANK',70000,$1,'00000000-0000-4000-8000-000000000091') id",
        [bank],
      )
    ).rows[0].id;
    const ref = (
      await db.query(
        "select reference from wallet_withdrawal_records where id=$1",
        [id],
      )
    ).rows[0].reference;
    assert.equal(withdrawalReference("Chi tien " + ref), ref);
    assert.equal(withdrawalReference(ref.replaceAll("-", " ")), ref);
    assert.equal(withdrawalReference(ref + " " + ref), null);
    const outgoing = await source(db, 70000, null, "OUT");
    const attribute = async (s = outgoing.id, r = ref) =>
      (await db.query("select reloo_attribute_payout_out($1,$2) v", [s, r]))
        .rows[0].v;
    assert.equal(await attribute(), false);
    await db.query(
      "select reloo_review_payout('admin',$1,'APPROVE','Đã kiểm tra điều kiện cấp quyền chi trả',null)",
      [id],
    );
    await db.query(
      "select reloo_review_payout('admin',$1,'PROCESS','Đã kiểm tra ngân hàng và bắt đầu chi trả',null)",
      [id],
    );
    const wrong = await source(db, 69999, null, "OUT");
    assert.equal(await attribute(wrong.id), false);
    assert.equal(await attribute(outgoing.id, ref + "BAD"), false);
    assert.equal(await attribute(), true);
    assert.equal(await attribute(), true);
    assert.equal(
      (
        await db.query(
          "select status from wallet_withdrawal_records where id=$1",
          [id],
        )
      ).rows[0].status,
      "PROCESSING",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from customer_cash_entries where direction='OUT'",
        )
      ).rows[0].n,
      1,
    );
    await db.query(
      "select reloo_review_payout('admin',$1,'CONFIRM_PAID','Người thụ hưởng và chứng từ ngân hàng đã khớp',$2)",
      [id, outgoing.id],
    );
    assert.equal(await attribute(), true);
    const duplicate = await source(db, 70000, null, "OUT");
    assert.equal(await attribute(duplicate.id), false);
    assert.equal(
      (await db.query("select reloo_payout_available('alice') v")).rows[0].v
        .total,
      "30000",
    );
  } finally {
    await db.close();
  }
});
test("deposit funds remain protected until completed obligations and staff release; refund source cannot spend deposit money", async () => {
  const db = await setup();
  try {
    const f = await source(db, 100000, "alice");
    await db.query(
      "select reloo_classify_wallet_entry('admin',$1,'DEPOSIT','Khoản tiền cọc theo thỏa thuận đã đối chiếu')",
      [f.entry],
    );
    const rental = (
      await db.query(
        "insert into rental_agreements(renter_id,lender_id,status) values('alice','bob','ACTIVE') returning id",
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "select reloo_release_payout('admin','alice','DEPOSIT',50000,$1,'Hoàn tiền cọc theo biên bản trả đồ đã kiểm tra')",
        [f.id],
      ),
      /OBLIGATIONS_OPEN/,
    );
    await assert.rejects(
      db.query(
        "select reloo_release_payout('admin','alice','REFUND',50000,$1,'Hoàn tiền cọc theo biên bản trả đồ đã kiểm tra')",
        [f.id],
      ),
      /CLASSIFICATION/,
    );
    await db.query("update rental_agreements set status='CLOSED' where id=$1", [
      rental,
    ]);
    await db.query(
      "select reloo_release_payout('admin','alice','DEPOSIT',50000,$1,'Hoàn tiền cọc theo biên bản trả đồ đã kiểm tra')",
      [f.id],
    );
    const available = (
      await db.query("select reloo_payout_available('alice') v")
    ).rows[0].v;
    assert.equal(available.sources.DEPOSIT, "50000");
    assert.equal(available.total, "50000");
    assert.equal(available.sources.REFUND, "0");
  } finally {
    await db.close();
  }
});
