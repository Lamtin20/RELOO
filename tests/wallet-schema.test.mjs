import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("wallet snapshot isolates customers; classification is append-only and paid withdrawals require genuine outbound evidence", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id text primary key);insert into profiles values('owner'),('alice'),('bob');
 create table automation_jobs(id uuid default gen_random_uuid(),kind text,payload jsonb);
 create table security_audit(id bigserial,actor_id text,subject_id text,action text,details jsonb);
 create table business_settings(id boolean primary key,deposit jsonb);insert into business_settings values(true,'{"enabled":false}');
 create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select actor='owner'$$;
 create table affiliate_clicks(id text primary key,profile_id text,merchant text);
 create table cashback_conversions(id text primary key,click_id text,provider_order_id text,merchant text,status text,reward bigint,provider_updated_at timestamptz,created_at timestamptz);
 create table cashback_ledger(id uuid default gen_random_uuid(),profile_id text,conversion_id text,amount bigint,event_type text,created_at timestamptz default now());`);
    for (const name of ["finance", "cashflow", "wallet-display"])
      await db.exec(
        await readFile(
          new URL("../deploy/vietnam/" + name + ".sql", import.meta.url),
          "utf8",
        ),
      );
    async function entry(profile, direction, value) {
      const inbox = (
        await db.query(
          "insert into finance_webhook_inbox(provider_event_id,body_hash,payload_encrypted) values(gen_random_uuid(),'fixture','fixture') returning id",
        )
      ).rows[0].id;
      const source = (
        await db.query(
          "insert into finance_sources(provider,provider_id,bank_account_id,direction,amount,reference_hash,occurred_at,evidence_encrypted,evidence_envelope,evidence_hash,signature,signing_key_id,inbox_id) values('SEPAY',gen_random_uuid(),'test-bank',$1,$2,'fixture',now(),'fixture','{}','fixture','fixture','fixture',$3) returning id,occurred_at",
          [direction, value, inbox],
        )
      ).rows[0];
      return (
        await db.query(
          "insert into customer_cash_entries(profile_id,source_id,direction,amount,reference,occurred_at) values($1,$2,$3,$4,$5,$6) returning *",
          [
            profile,
            source.id,
            direction,
            value,
            "TEST-" + profile,
            source.occurred_at,
          ],
        )
      ).rows[0];
    }
    const alice = await entry("alice", "IN", "9007199254740991"),
      out = await entry("alice", "OUT", "500000"),
      bob = await entry("bob", "OUT", "500000");
    await db.exec(
      `insert into affiliate_clicks values('click-a','alice','shopee'),('click-b','bob','tiktok');insert into cashback_conversions values('conv-a','click-a','ORDER-A','provider-long-name','APPROVED',12000,now(),now()),('conv-b','click-b','ORDER-B','another-provider-name','APPROVED',99999,now(),now());insert into cashback_ledger(profile_id,conversion_id,amount,event_type) values('alice','conv-a',12000,'APPROVED'),('bob','conv-b',99999,'APPROVED');`,
    );
    const classify = "select reloo_classify_wallet_entry($1,$2,$3,$4)",
      reason = "Hợp đồng thuê đã được đối chiếu với khách hàng";
    await assert.rejects(
      db.query(classify, ["alice", alice.id, "RENTAL", reason]),
      /PERMISSION_REQUIRED/,
    );
    await assert.rejects(
      db.query(classify, ["owner", alice.id, "DEPOSIT", reason]),
      /DEPOSIT_NOT_ENABLED/,
    );
    await db.query(classify, ["owner", alice.id, "RENTAL", reason]);
    await db.query(classify, [
      "owner",
      alice.id,
      "BANK",
      "Sửa phân loại theo chứng từ ngân hàng đã kiểm tra",
    ]);
    await assert.rejects(
      db.query("update wallet_category_events set source_code='DEPOSIT'"),
      /IMMUTABLE_RECORD/,
    );
    const read = async (profile) =>
      (await db.query("select reloo_wallet_snapshot($1) wallet", [profile]))
        .rows[0].wallet;
    const a = await read("alice");
    assert.equal(a.bankCount, 2);
    assert.equal(
      a.bankEntries.find((e) => e.id === alice.id).amount,
      "9007199254740991",
    );
    assert.equal(
      a.bankEntries.find((e) => e.id === alice.id).sourceCode,
      "BANK",
    );
    assert.equal(a.conversionsCount, 1);
    assert.equal(a.conversions[0].merchant, "shopee");
    assert.equal(a.cashbackLedger.length, 1);
    assert.equal(a.cashbackLedger[0].amount, "12000");
    assert.equal((await read("bob")).bankCount, 1);
    assert.equal((await read("nonexistent")).bankCount, 0);
    const withdrawal =
      "insert into wallet_withdrawal_records(profile_id,source_code,amount,status,reference,masked_account,bank_name,paid_source_id) values('alice','BANK',$1,'PAID',$2,'***1234','VCB',$3)";
    await assert.rejects(
      db.query(withdrawal, ["500000", "WRONG-OWNER", bob.source_id]),
      /PAID_WITHDRAWAL_EVIDENCE_REQUIRED/,
    );
    await assert.rejects(
      db.query(withdrawal, [
        "9007199254740991",
        "WRONG-DIRECTION",
        alice.source_id,
      ]),
      /PAID_WITHDRAWAL_EVIDENCE_REQUIRED/,
    );
    await assert.rejects(
      db.query(withdrawal, ["600000", "WRONG-AMOUNT", out.source_id]),
      /PAID_WITHDRAWAL_EVIDENCE_REQUIRED/,
    );
    await db.query(withdrawal, ["500000", "VALID-PAID", out.source_id]);
    await assert.rejects(
      db.query(withdrawal, ["500000", "REUSED-PAID", out.source_id]),
      /unique constraint/,
    );
    assert.equal((await read("alice")).withdrawals[0].status, "PAID");
    assert.equal((await read("bob")).withdrawalsCount, 0);
    assert.equal(
      (
        await db.query(
          "select count(*)::integer n from security_audit where action='WALLET_SOURCE_CLASSIFIED'",
        )
      ).rows[0].n,
      2,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      await assert.rejects(
        db.query("select reloo_wallet_snapshot('alice')"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from wallet_withdrawal_records"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
