import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
create table profiles(id text primary key,status text);insert into profiles values('owner','ACTIVE'),('alice','ACTIVE'),('bob','ACTIVE'),('blocked','BLOCKED');
create table rental_agreements(id uuid primary key default gen_random_uuid(),renter_id text,lender_id text,status text);
create table transactions(id uuid primary key default gen_random_uuid(),renter_id text,lender_id text,status text);
create table automation_jobs(id uuid default gen_random_uuid(),kind text,payload jsonb);create table security_audit(id bigserial,actor_id text,subject_id text,action text,details jsonb);
create table business_settings(id boolean primary key,deposit jsonb);insert into business_settings values(true,'{"enabled":true}');
create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select actor='owner'$$;
create function reloo_assert_active(actor text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=actor and status='ACTIVE') then raise exception 'ACCOUNT_RESTRICTED';end if;end$$;
create table verified_identities(profile_id text primary key,expires_at timestamptz);insert into verified_identities values('alice',now()+interval '1 month'),('bob',now()+interval '1 month');
create table profile_bank_accounts(id uuid primary key default gen_random_uuid(),profile_id text,name_status text,bank_name text,masked_account text,account_encrypted text,account_hash text,holder_encrypted text);
create table affiliate_clicks(id text primary key,profile_id text,merchant text);create table cashback_conversions(id text primary key,click_id text,provider_order_id text,merchant text,status text,reward bigint,provider_updated_at timestamptz,created_at timestamptz);create table cashback_ledger(id uuid default gen_random_uuid(),profile_id text,conversion_id text,amount bigint,event_type text,created_at timestamptz default now());
create table assets(id text primary key,owner_id text,title text,status text,is_locked boolean default false);insert into assets values('alice-camera','alice','Máy ảnh Alice','available',false),('bob-camera','bob','Máy ảnh Bob','available',false);`);
  for (const name of [
    "finance",
    "cashflow",
    "wallet-display",
    "payout-requests",
    "short-videos",
    "mobile-auth",
  ])
    await db.exec(
      await readFile(
        new URL("../deploy/vietnam/" + name + ".sql", import.meta.url),
        "utf8",
      ),
    );
  return db;
}
async function fund(db, profile, direction, amount) {
  const inbox = (
    await db.query(
      "insert into finance_webhook_inbox(provider_event_id,body_hash,payload_encrypted) values(gen_random_uuid(),'test','test') returning id",
    )
  ).rows[0].id;
  const source = (
    await db.query(
      "insert into finance_sources(provider,provider_id,bank_account_id,direction,amount,reference_hash,occurred_at,evidence_encrypted,evidence_envelope,evidence_hash,signature,signing_key_id,inbox_id) values('SEPAY',gen_random_uuid(),'test-bank',$1,$2,'test',now(),'test','{}','test','test','test',$3) returning id,occurred_at",
      [direction, amount, inbox],
    )
  ).rows[0];
  const entry = (
    await db.query(
      "insert into customer_cash_entries(profile_id,source_id,direction,amount,reference,occurred_at) values($1,$2,$3,$4,$5,$6) returning id",
      [profile, source.id, direction, amount, "TEST", source.occurred_at],
    )
  ).rows[0];
  return { ...source, entry: entry.id };
}
test("payouts use funded entitlement, reserve atomically, deduplicate and enforce approval/paid evidence", async () => {
  const db = await setup();
  try {
    const a = await fund(db, "alice", "IN", "1000000"),
      b = await fund(db, "bob", "IN", "1000000");
    const bank = (
      await db.query(
        "insert into profile_bank_accounts(profile_id,name_status,bank_name,masked_account,account_encrypted,account_hash,holder_encrypted) values('alice','DECLARED_NAME_MATCH','VCB','***1234','encrypted','hash','encrypted-holder') returning id",
      )
    ).rows[0].id;
    const otherBank = (
      await db.query(
        "insert into profile_bank_accounts(profile_id,name_status,bank_name) values('bob','DECLARED_NAME_MATCH','VCB') returning id",
      )
    ).rows[0].id;
    const available = async () =>
      (await db.query("select reloo_payout_available('alice') data")).rows[0]
        .data;
    assert.equal((await available()).total, "0");
    const reason = "Chứng từ cho thuê đã được kiểm tra và đối soát";
    const release = "select reloo_release_payout($1,$2,$3,$4,$5,$6)";
    await assert.rejects(
      db.query(release, ["alice", "alice", "BANK", "1000000", a.id, reason]),
      /PERMISSION_REQUIRED/,
    );
    await assert.rejects(
      db.query(release, ["owner", "alice", "BANK", "1000000", b.id, reason]),
      /VERIFIED_FUNDING_REQUIRED/,
    );
    await db.query(release, [
      "owner",
      "alice",
      "BANK",
      "1000000",
      a.id,
      reason,
    ]);
    await assert.rejects(
      db.query(release, ["owner", "alice", "BANK", "1", a.id, reason]),
      /FUNDING_ALREADY_ALLOCATED/,
    );
    assert.equal((await available()).total, "1000000");
    const request = "select reloo_request_payout($1,$2,$3,$4,$5) id",
      key = "00000000-0000-4000-8000-000000000001";
    await assert.rejects(
      db.query(request, ["alice", "BANK", "1", otherBank, key]),
      /VERIFIED_BANK_REQUIRED/,
    );
    const id = (await db.query(request, ["alice", "BANK", "700000", bank, key]))
      .rows[0].id;
    assert.equal(
      (await db.query(request, ["alice", "BANK", "700000", bank, key])).rows[0]
        .id,
      id,
    );
    await assert.rejects(
      db.query(request, ["alice", "BANK", "600000", bank, key]),
      /REQUEST_KEY_CONFLICT/,
    );
    assert.equal((await available()).total, "300000");
    await assert.rejects(
      db.query(request, [
        "alice",
        "BANK",
        "300001",
        bank,
        "00000000-0000-4000-8000-000000000002",
      ]),
      /INSUFFICIENT/,
    );
    const review = "select reloo_review_payout($1,$2,$3,$4,$5)";
    await assert.rejects(
      db.query(review, ["alice", id, "APPROVE", reason, null]),
      /PERMISSION_REQUIRED/,
    );
    await db.query(review, ["owner", id, "APPROVE", reason, null]);
    await db.query(review, ["owner", id, "PROCESS", reason, null]);
    await assert.rejects(
      db.query("select reloo_cancel_payout('alice',$1)", [id]),
      /CANNOT_CANCEL/,
    );
    await assert.rejects(
      db.query(review, ["owner", id, "REJECT", reason, null]),
      /INVALID_PAYOUT_TRANSITION/,
    );
    const wrong = await fund(db, "bob", "OUT", "700000");
    await assert.rejects(
      db.query(review, ["owner", id, "CONFIRM_PAID", reason, wrong.id]),
      /EVIDENCE_REQUIRED/,
    );
    const paid = await fund(db, "alice", "OUT", "700000");
    await db.query(review, ["owner", id, "CONFIRM_PAID", reason, paid.id]);
    assert.equal((await available()).total, "300000");
    await assert.rejects(
      db.query("update wallet_withdrawal_records set amount=1 where id=$1", [
        id,
      ]),
      /IMMUTABLE/,
    );
    assert.equal(
      (await db.query("select count(*)::int n from cashflow_payout_events"))
        .rows[0].n,
      4,
    );
    const key2 = "00000000-0000-4000-8000-000000000003",
      id2 = (await db.query(request, ["alice", "BANK", "300000", bank, key2]))
        .rows[0].id;
    assert.equal((await available()).total, "0");
    await db.query("select reloo_cancel_payout('alice',$1)", [id2]);
    assert.equal((await available()).total, "300000");
    await db.exec(
      "update verified_identities set expires_at=now()-interval '1 day' where profile_id='alice'",
    );
    await assert.rejects(
      db.query(request, [
        "alice",
        "BANK",
        "1",
        bank,
        "00000000-0000-4000-8000-000000000004",
      ]),
      /VALID_IDENTITY_REQUIRED/,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select reloo_payout_available('alice')"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("payout approval rechecks funds when other bank movements consume reserved funds", async () => {
  const db = await setup();
  try {
    const a = await fund(db, "alice", "IN", "100000");
    await db.query(
      "select reloo_release_payout('owner','alice','BANK',100000,$1,'Đã kiểm tra chứng từ và xác nhận khoản chi trả')",
      [a.id],
    );
    const bank = (
      await db.query(
        "insert into profile_bank_accounts(profile_id,name_status,bank_name,masked_account,account_encrypted,account_hash,holder_encrypted) values('alice','DECLARED_NAME_MATCH','VCB','***0000','encrypted','hash','holder') returning id",
      )
    ).rows[0].id;
    const id = (
      await db.query(
        "select reloo_request_payout('alice','BANK',80000,$1,'00000000-0000-4000-8000-000000000009') id",
        [bank],
      )
    ).rows[0].id;
    await fund(db, "alice", "OUT", "50000");
    await assert.rejects(
      db.query(
        "select reloo_review_payout('owner',$1,'APPROVE','Đã kiểm tra chứng từ cho khoản này',null)",
        [id],
      ),
      /PAYOUT_FUNDING_CHANGED/,
    );
    await db.query("select reloo_cancel_payout('alice',$1)", [id]);
    assert.equal(
      (await db.query("select reloo_payout_available('alice') data")).rows[0]
        .data.total,
      "50000",
    );
  } finally {
    await db.close();
  }
});
test("shorts enforce ownership, ready media, product links, private permissions and moderation versions", async () => {
  const db = await setup();
  try {
    const media = (
      await db.query(
        "insert into short_video_media(id,profile_id,filename,duration,width,height,bytes,status) values(gen_random_uuid(),'alice',gen_random_uuid()||'.mp4',5,360,640,10000,'READY') returning id",
      )
    ).rows[0].id;
    const create = "select reloo_create_short($1,$2,$3,$4,false) id";
    await assert.rejects(
      db.query(create, [
        "bob",
        media,
        "Test",
        [{ kind: "RENTAL", assetId: "bob-camera" }],
      ]),
      /SHORT_INPUT_REQUIRED/,
    );
    await assert.rejects(
      db.query(create, [
        "alice",
        media,
        "Test",
        [{ kind: "RENTAL", assetId: "bob-camera" }],
      ]),
      /OWNED_AVAILABLE/,
    );
    await assert.rejects(
      db.query(create, [
        "alice",
        media,
        "Test",
        [
          {
            kind: "EXTERNAL",
            title: "Sản phẩm",
            href: "https://shopee.vn.evil.invalid/x",
          },
        ],
      ]),
      /INVALID_PRODUCT_LINK/,
    );
    const id = (
      await db.query(create, [
        "alice",
        media,
        "Giới thiệu máy ảnh của tôi",
        [
          { kind: "RENTAL", assetId: "alice-camera" },
          {
            kind: "EXTERNAL",
            title: "Đèn quay video",
            href: "https://shopee.vn/product/123/456",
          },
        ],
      ])
    ).rows[0].id;
    assert.equal(
      (await db.query("select status from short_videos where id=$1", [id]))
        .rows[0].status,
      "PENDING",
    );
    const review = "select reloo_review_short($1,$2,$3,$4,$5)";
    await assert.rejects(
      db.query(review, ["alice", id, 1, true, "Đã kiểm tra nội dung"]),
      /PERMISSION_REQUIRED/,
    );
    await db.query(review, [
      "owner",
      id,
      1,
      true,
      "Đã kiểm tra nội dung và sản phẩm",
    ]);
    await assert.rejects(
      db.query(review, ["owner", id, 1, true, "Đã kiểm tra nội dung"]),
      /SHORT_VERSION_CHANGED/,
    );
    await db.query(review, [
      "owner",
      id,
      2,
      false,
      "Ẩn video để kiểm tra báo cáo",
    ]);
    assert.equal(
      (await db.query("select status from short_videos where id=$1", [id]))
        .rows[0].status,
      "ARCHIVED",
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from short_videos"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(create, ["alice", media, "Test", []]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("native login handoff is challenge-bound, single-use, expiring and clears encrypted sessions", async () => {
  const db = await setup();
  try {
    const challenge = "a".repeat(64),
      id = (
        await db.query(
          "insert into mobile_auth_flows(challenge,next_path,intent) values($1,'/shorts','both') returning id",
          [challenge],
        )
      ).rows[0].id;
    await db.query("select reloo_complete_mobile_auth($1,$2)", [
      id,
      "encrypted-test-session",
    ]);
    await assert.rejects(
      db.query("select reloo_consume_mobile_auth($1,$2)", [id, "b".repeat(64)]),
      /MOBILE_FLOW_INVALID/,
    );
    const flow = (
      await db.query("select reloo_consume_mobile_auth($1,$2) flow", [
        id,
        challenge,
      ])
    ).rows[0].flow;
    assert.equal(flow.next, "/shorts");
    assert.equal(flow.session, "encrypted-test-session");
    assert.equal(
      (
        await db.query(
          "select session_encrypted from mobile_auth_flows where id=$1",
          [id],
        )
      ).rows[0].session_encrypted,
      null,
    );
    await assert.rejects(
      db.query("select reloo_consume_mobile_auth($1,$2)", [id, challenge]),
      /MOBILE_FLOW_INVALID/,
    );
    const expired = (
      await db.query(
        "insert into mobile_auth_flows(challenge,next_path,intent,expires_at) values($1,'/','both',now()-interval '1 second') returning id",
        [challenge],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select reloo_complete_mobile_auth($1,$2)", [expired, "test"]),
      /MOBILE_FLOW_EXPIRED/,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from mobile_auth_flows"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
