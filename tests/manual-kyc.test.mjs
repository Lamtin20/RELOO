import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  validExpiry,
  validPhotoSession,
  manualKycEnabled,
} from "../lib/kyc/manual.js";
import { integrationReadiness } from "../lib/operations/integrations.js";

test("manual intake requires a real expiry date in Vietnam and a fresh photo session belonging to the account", () => {
  const now = new Date("2026-10-10T18:00:00Z");
  assert.equal(validExpiry("2026-10-10", now), false);
  assert.equal(validExpiry("2026-10-11", now), true);
  for (const value of ["", "2027-02-31", "2027-13-01", "31/12/2030"])
    assert.equal(validExpiry(value, now), false);
  const session = {
    profile_id: "owner",
    issued_at: new Date(now - 1000).toISOString(),
    expires_at: new Date(+now + 60000).toISOString(),
    consumed_at: null,
  };
  assert.equal(validPhotoSession(session, "owner", +now), true);
  assert.equal(validPhotoSession(session, "other", +now), false);
  assert.equal(
    validPhotoSession(
      { ...session, consumed_at: now.toISOString() },
      "owner",
      +now,
    ),
    false,
  );
  assert.equal(validPhotoSession(session, "owner", +now + 61000), false);
});
test("configured VNPT credentials cannot enable the service during the manual phase", (t) => {
  const previous = process.env.RELOO_KYC_MODE;
  process.env.RELOO_KYC_MODE = "MANUAL";
  t.after(() => {
    if (previous === undefined) delete process.env.RELOO_KYC_MODE;
    else process.env.RELOO_KYC_MODE = previous;
  });
  const config = {
    VNPT_TOKEN_ID: "id",
    VNPT_TOKEN_KEY: "key",
    VNPT_ACCESS_TOKEN: `header.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString("base64url")}.signature`,
    health: { status: "OK" },
  };
  assert.equal(manualKycEnabled(), true);
  assert.equal(integrationReadiness("VNPT", config).paused, true);
  assert.equal(integrationReadiness("VNPT", config).ready, false);
});
test("manual submissions are atomic, consume camera sessions once, reach only staff review and require all three photographs", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create table profiles(id text primary key,kyc_level text default 'L0',activation_status text default 'ACTIVE');
      create table crm_staff(profile_id text primary key,permissions text[]);
      create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select exists(select 1 from crm_staff where profile_id=actor and permission=any(permissions))$$;
      create table security_audit(id bigserial primary key,actor_id text,subject_id text,action text,details jsonb);
      create table kyc_submissions(id uuid primary key,profile_id text references profiles(id),national_id_encrypted text,national_id_hash text,document_paths jsonb,consent_at timestamptz,status text default 'QUEUED',provider text,checks jsonb,created_at timestamptz default now(),expires_at timestamptz default now()+interval '30 days',reason text,reviewed_by text);
      create table verified_identities(profile_id text primary key,submission_id uuid,fields_encrypted text,holder_name_hash text,national_id_hash text unique,expires_at timestamptz,verified_at timestamptz default now());
      create table profile_bank_accounts(profile_id text,holder_name_hash text,name_status text);
      create table automation_jobs(id uuid primary key default gen_random_uuid(),kind text);
      insert into profiles(id) values('owner'),('other'),('admin');
      insert into crm_staff values('admin',array['kyc.write']);`);
    await db.exec(
      await readFile(
        new URL("../deploy/vietnam/manual-kyc.sql", import.meta.url),
        "utf8",
      ),
    );
    const session = (
      await db.query(
        "insert into kyc_photo_sessions(profile_id,capture_version) values('owner',2) returning id",
      )
    ).rows[0].id;
    const id = "00000000-0000-4000-8000-000000000001";
    const paths = (key) => ({
      front: `${key}-front.enc`,
      back: `${key}-back.enc`,
      selfie: `${key}-selfie.enc`,
      portraitSource: "CAMERA_CAPTURE",
      mode: "MANUAL",
    });
    const submit = (profile, key, photoSession = session, data = paths(key)) =>
      db.query("select reloo_submit_manual_kyc($1,$2,$3,$4,$5,$6,$7)", [
        profile,
        key,
        "encrypted-declaration-test-value",
        "a".repeat(64),
        "2099-12-31",
        data,
        photoSession,
      ]);
    await assert.rejects(submit("other", id), /PHOTO_SESSION_EXPIRED/);
    await assert.rejects(
      submit("owner", id, session, { ...paths(id), portraitSource: "UPLOAD" }),
      /THREE_PHOTOS_REQUIRED/,
    );
    assert.equal(
      (
        await db.query(
          "select consumed_at from kyc_photo_sessions where id=$1",
          [session],
        )
      ).rows[0].consumed_at,
      null,
    );
    await submit("owner", id);
    const saved = (
      await db.query(
        "select status,provider,checks,extract(epoch from review_due_at-created_at)/3600 hours from kyc_submissions where id=$1",
        [id],
      )
    ).rows[0];
    assert.equal(saved.status, "REVIEW");
    assert.equal(saved.provider, "MANUAL");
    assert.equal(saved.checks.eligible, false);
    assert.equal(Number(saved.hours), 72);
    assert.equal(
      (await db.query("select count(*)::int n from automation_jobs")).rows[0].n,
      0,
    );
    const id2 = "00000000-0000-4000-8000-000000000002";
    await assert.rejects(submit("owner", id2), /PHOTO_SESSION_EXPIRED/);
    const session2 = (
      await db.query(
        "insert into kyc_photo_sessions(profile_id,capture_version) values('owner',2) returning id",
      )
    ).rows[0].id;
    await submit("owner", id2, session2);
    assert.ok(
      (
        await db.query(
          "select superseded_at from kyc_submissions where id=$1",
          [id],
        )
      ).rows[0].superseded_at,
    );
    const approve = (actor) =>
      db.query("select reloo_review_kyc_identity($1,$2,$3,$4,$5,$6)", [
        actor,
        id2,
        "Reviewed all documents in isolated test",
        "encrypted-identity-test",
        "b".repeat(64),
        "a".repeat(64),
      ]);
    await assert.rejects(approve("owner"), /PERMISSION_REQUIRED/);
    await assert.rejects(approve("admin"), /REVIEW_ALL_DOCUMENTS/);
    for (const kind of ["front", "back", "video"])
      await db.query(
        "insert into security_audit(actor_id,action,details) values('admin','KYC_DOCUMENT_VIEWED',$1)",
        [{ id: id2, kind }],
      );
    await assert.rejects(approve("admin"), /REVIEW_ALL_DOCUMENTS/);
    await db.query(
      "insert into security_audit(actor_id,action,details) values('admin','KYC_DOCUMENT_VIEWED',$1)",
      [{ id: id2, kind: "selfie" }],
    );
    await db.query(
      "update kyc_submissions set review_due_at=now()-interval '1 hour' where id=$1",
      [id2],
    );
    await db.query("select reloo_mark_overdue_kyc()");
    await db.query("select reloo_mark_overdue_kyc()");
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from security_audit where action='KYC_REVIEW_OVERDUE'",
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select status from kyc_submissions where id=$1", [id2]))
        .rows[0].status,
      "REVIEW",
    );
    await approve("admin");
    assert.equal(
      (await db.query("select kyc_level from profiles where id='owner'"))
        .rows[0].kyc_level,
      "L2",
    );
    assert.equal(
      (
        await db.query(
          "select expires_at=timestamp '2100-01-01 00:00:00' at time zone 'Asia/Ho_Chi_Minh' valid from verified_identities where profile_id='owner'",
        )
      ).rows[0].valid,
      true,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from kyc_photo_sessions"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select reloo_mark_overdue_kyc()"),
      /permission denied/,
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
