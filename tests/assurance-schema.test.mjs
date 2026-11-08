import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("database enforces immutable phone, private evidence, atomic queue and configuration permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create table profiles(id text primary key,phone text,name text,activation_status text default 'PENDING',profile_data jsonb default '{}',kyc_level text default 'L0');
      create table crm_staff(profile_id text primary key,permissions text[] not null,enabled boolean default true);
      create table security_audit(id bigserial primary key,actor_id text,subject_id text,action text,details jsonb);
      create table risk_blacklist(profile_id text,status text,expires_at timestamptz);
      create table automation_jobs(id uuid primary key default gen_random_uuid(),kind text,payload jsonb,created_by text);
      create table kyc_submissions(id uuid primary key,profile_id text references profiles(id),national_id_encrypted text,national_id_hash text,document_paths jsonb,consent_at timestamptz,status text default 'QUEUED',expires_at timestamptz default now()+interval '30 days',face_result jsonb,reason text);
      create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select exists(select 1 from crm_staff where profile_id=actor and enabled and ('*'=any(permissions) or permission=any(permissions)))$$;
      insert into profiles(id,phone) values('owner','0912345678'),('new',null),('other','0987654321');
      insert into crm_staff values('owner',array['*'],true);`);
    await db.exec(
      await readFile(
        new URL("../deploy/vietnam/assurance.sql", import.meta.url),
        "utf8",
      ),
    );
    await assert.rejects(
      db.query("update profiles set phone='0900000000' where id='owner'"),
      /REGISTERED_PHONE_IMMUTABLE/,
    );
    await db.query("update profiles set phone='0900000000' where id='new'");
    await assert.rejects(
      db.query(
        "select reloo_profile_update('owner','{\"phone\":\"0900000000\"}')",
      ),
      /IMMUTABLE_OR_UNKNOWN_FIELD/,
    );
    await assert.rejects(
      db.query("select reloo_save_business('other',1,'{}',null)"),
      /PERMISSION_REQUIRED/,
    );
    await db.query(
      "select reloo_save_business('owner',1,'{\"legalName\":\"Test only\"}',null)",
    );
    await assert.rejects(
      db.query("select reloo_save_business('owner',1,'{}',null)"),
      /VERSION_CONFLICT/,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from verified_identities"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select reloo_save_integration('owner','VNPT',0,'{}','encrypted')",
      ),
      /permission denied/,
    );
    await db.exec("reset role");
    const c = await db.query(
      'insert into kyc_challenges(profile_id,poses) values(\'owner\',\'["STRAIGHT","LEFT","RIGHT","STRAIGHT"]\') returning id',
    );
    const challenge = c.rows[0].id,
      id = "00000000-0000-4000-8000-000000000001";
    await assert.rejects(
      db.query("select reloo_queue_kyc($1,$2,$3,$4,$5,$6)", [
        "other",
        id,
        "encrypted",
        "hash",
        {},
        challenge,
      ]),
      /CHALLENGE_EXPIRED/,
    );
    await db.query("select reloo_queue_kyc($1,$2,$3,$4,$5,$6)", [
      "owner",
      id,
      "encrypted",
      "hash",
      {},
      challenge,
    ]);
    assert.equal(
      (await db.query("select count(*)::integer n from automation_jobs"))
        .rows[0].n,
      1,
    );
    await assert.rejects(
      db.query("select reloo_queue_kyc($1,$2,$3,$4,$5,$6)", [
        "owner",
        "00000000-0000-4000-8000-000000000002",
        "encrypted",
        "hash",
        {},
        challenge,
      ]),
      /CHALLENGE_EXPIRED/,
    );
    await db.query(
      "update kyc_submissions set status='REVIEW',provider='VNPT',checks='{}',face_result='{}' where id=$1",
      [id],
    );
    await assert.rejects(
      db.query("select reloo_confirm_kyc($1,$2,$3,$4)", [
        "owner",
        id,
        "encrypted",
        "a".repeat(64),
      ]),
      /AUTHORITATIVE_CHECKS_REQUIRED/,
    );
    const bank = {
      bank_code: "VCB",
      bank_bin: "970436",
      bank_name: "Test bank",
      account_hash: "a".repeat(64),
      holder_name_hash: "b".repeat(64),
      account_encrypted: "c".repeat(40),
      holder_encrypted: "d".repeat(40),
      masked_account: "•••• 1234",
      is_default: true,
    };
    await db.query("select reloo_save_bank($1,$2)", ["owner", bank]);
    await db.query(
      "insert into verified_identities(profile_id,submission_id,fields_encrypted,holder_name_hash) values('owner',$1,'encrypted',$2)",
      [id, "e".repeat(64)],
    );
    await assert.rejects(
      db.query("select reloo_save_bank($1,$2)", ["owner", bank]),
      /HOLDER_ID_MISMATCH/,
    );
    assert.equal(
      (
        await db.query(
          "select name_status from profile_bank_accounts where profile_id='owner'",
        )
      ).rows[0].name_status,
      "WAIT_ID",
    );
  } finally {
    await db.close();
  }
});
