import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone.js";
import { PGlite } from "../output/verification/node_modules/@electric-sql/pglite/dist/index.js";

// This isolated PostgreSQL fixture tests rules; it is never used by the app.
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create table profiles(id text primary key,auth_user_id uuid unique,email text unique,name text,phone text,avatar_url text,role text default 'renter',status text default 'active');
create table assets(id text primary key,owner_id text references profiles(id),status text default 'available',is_locked boolean default false);
create table chat_threads(id text primary key,thread_type text default 'inquiry',listing_id text references assets(id),transaction_id text,lender_id text references profiles(id),buyer_id text references profiles(id),created_at timestamptz default now(),updated_at timestamptz default now());
create table chat_messages(id text primary key,thread_id text references chat_threads(id),sender_id text,message_type text,body text,message_data jsonb default '{}',read_by jsonb default '[]',created_at timestamptz default now());
`);
const migration = await readFile(
  new URL(
    "../supabase/migrations/20261008010000_security_commerce.sql",
    import.meta.url,
  ),
  "utf8",
);
await db.exec(migration);
await db.exec(migration);
const onboardingMigration = await readFile(
  new URL(
    "../supabase/migrations/20261009090000_auth_onboarding.sql",
    import.meta.url,
  ),
  "utf8",
);
await db.exec(onboardingMigration);
await db.exec(onboardingMigration);
const marketMigration = await readFile(
  new URL(
    "../supabase/migrations/20261009120000_market_data.sql",
    import.meta.url,
  ),
  "utf8",
);
await db.exec(marketMigration);
await db.exec(marketMigration);
assert.equal(
  (await db.query("select reloo_normalize_phone('+84 912 345 678') as phone"))
    .rows[0].phone,
  "0912345678",
);
const candidates = [];
for (let prefix = 0; prefix < 1000; prefix++) {
  for (const suffix of ["000000", "123456", "999999"])
    candidates.push(`0${String(prefix).padStart(3, "0")}${suffix}`);
}
const phoneRules = await db.query(
  "select value as input,reloo_normalize_phone(value) as phone from jsonb_array_elements_text($1::jsonb)",
  [JSON.stringify(candidates)],
);
for (const row of phoneRules.rows)
  assert.equal(row.phone, normalizePhone(row.input), row.input);
for (const input of [
  "+84 83 123 45 67",
  "84831234567",
  "0084831234567",
  "0711234567",
  "+16502530000",
  "call 0831234567",
])
  assert.equal(
    (await db.query("select reloo_normalize_phone($1) as phone", [input]))
      .rows[0].phone,
    normalizePhone(input),
    input,
  );
await db.exec(
  `insert into profiles(id,name,phone,role,activation_status,screening_valid_until) values ('admin','Admin','0912345678','admin','ACTIVE',now()+interval '30 days'),('lender','Lender','0987654321','lender','ACTIVE',now()+interval '30 days'),('renter','Renter','0901234567','renter','ACTIVE',now()+interval '30 days'),('pending','Pending','0931234567','renter','PENDING',null);`,
);
const result = await db.query(
  "select reloo_record_screening('pending','UNAVAILABLE',$1::jsonb,null) as outcome",
  [JSON.stringify([{ source: "checkscam", status: "UNAVAILABLE" }])],
);
assert.equal(result.rows[0].outcome.activation_status, "PENDING");
await assert.rejects(() => db.query("select reloo_assert_active('pending')"));
await assert.rejects(() =>
  db.query("insert into assets(id,owner_id) values('denied','pending')"),
);
await db.query("insert into assets(id,owner_id) values('camera','lender')");
const caseId = result.rows[0].outcome.case_id;
await assert.rejects(() =>
  db.query(
    "select reloo_review_case('admin',$1,'CLEAR','Verified identity and ownership of phone','[]'::jsonb,720)",
    [caseId],
  ),
);
await db.query(
  "select reloo_submit_appeal('pending',$1,'This is my number, please verify ownership','[]'::jsonb)",
  [caseId],
);
await db.query(
  "select reloo_review_case('admin',$1,'CLEAR','Identity and phone ownership checked with documents',$2::jsonb,720)",
  [
    caseId,
    JSON.stringify([
      {
        url: "https://example.com/evidence",
        note: "Phone ownership and identity verified",
      },
    ]),
  ],
);
await db.query("select reloo_assert_active('pending')");
await db.query("update profiles set phone='0711234567' where id='pending'");
await assert.rejects(() => db.query("select reloo_assert_active('pending')"));
await db.query("update profiles set phone='0931234567' where id='pending'");
const message = {
  id: "m1",
  type: "text",
  text: "Rental request",
  senderId: "admin",
};
const inquiry = await db.query(
  "select reloo_create_inquiry('renter','camera',$1::jsonb) as result",
  [JSON.stringify(message)],
);
assert.equal(inquiry.rows[0].result.message.senderId, "renter");
await db.query("select reloo_create_inquiry('renter','camera',$1::jsonb)", [
  JSON.stringify(message),
]);
assert.equal(
  (await db.query("select count(*)::int as count from chat_messages")).rows[0]
    .count,
  1,
);
await assert.rejects(() =>
  db.query(
    "select reloo_send_message('pending','inquiry_camera_renter',$1::jsonb)",
    [JSON.stringify({ ...message, id: "m2" })],
  ),
);
await db.query(
  "select reloo_add_phone_signal('admin','0901234567','verified_review','https://example.com/report','A reviewed report contains a matching phone',now()+interval '1 day')",
);
await assert.rejects(() => db.query("select reloo_assert_active('renter')"));
assert.equal(
  (await db.query("select activation_status from profiles where id='lender'"))
    .rows[0].activation_status,
  "ACTIVE",
);
await assert.rejects(() =>
  db.query("update security_audit set action='tampered'"),
);
await assert.rejects(() => db.query("delete from phone_screening_checks"));
await db.exec("set role anon");
await assert.rejects(() => db.query("select reloo_assert_active('lender')"));
await assert.rejects(() => db.query("select * from risk_evidence"));
await db.exec("reset role");
await db.exec("set role authenticated");
await assert.rejects(() =>
  db.query("update profiles set activation_status='ACTIVE' where id='renter'"),
);
await db.exec("reset role");
const click = "00000000-0000-4000-8000-000000000001";
await db.query(
  "insert into affiliate_clicks(id,profile_id,merchant,original_url,affiliate_url,reward_share) values($1,'lender','shopee','https://shopee.vn/a','https://tracking.accesstrade.me/a',0.7)",
  [click],
);
await db.query(
  "select reloo_sync_cashback('c1',$1,'shopee','o1','APPROVED',1000,'2026-10-08T10:00:00Z')",
  [click],
);
await db.query(
  "select reloo_sync_cashback('c1',$1,'shopee','o1','APPROVED',1000,'2026-10-08T10:00:00Z')",
  [click],
);
assert.equal(
  Number(
    (await db.query("select sum(amount) as total from cashback_ledger")).rows[0]
      .total,
  ),
  700,
);
await db.query(
  "select reloo_sync_cashback('c1',$1,'shopee','o1','REJECTED',1000,'2026-10-08T11:00:00Z')",
  [click],
);
await db.query(
  "select reloo_sync_cashback('c1',$1,'shopee','o1','APPROVED',1000,'2026-10-08T10:30:00Z')",
  [click],
);
assert.equal(
  Number(
    (await db.query("select sum(amount) as total from cashback_ledger")).rows[0]
      .total,
  ),
  0,
);
await db.query(
  "insert into shipping_shipments(label_id,profile_id,partner_id) values('g1','lender','p1')",
);
const event = {
  label_id: "g1",
  partner_id: "p1",
  status_id: 5,
  action_time: "2026-10-08T10:00:00Z",
};
await db.query("select reloo_ghtk_event('e1',$1)", [JSON.stringify(event)]);
await db.query("select reloo_ghtk_event('e1',$1)", [JSON.stringify(event)]);
await db.query("select reloo_ghtk_event('e2',$1)", [
  JSON.stringify({
    ...event,
    status_id: 4,
    action_time: "2026-10-08T09:00:00Z",
  }),
]);
assert.equal(
  (
    await db.query(
      "select status_id from shipping_shipments where label_id='g1'",
    )
  ).rows[0].status_id,
  5,
);
console.log(
  "PostgreSQL verification passed: activation, evidence, appeal, audit immutability, RPC permissions, listing gate, chat membership/idempotency, scoped signals, cashback reconciliation and webhook ordering.",
);
const googleId = "00000000-0000-4000-8000-000000000020";
const sourceResults = JSON.stringify([
  { source: "checkscam", status: "UNAVAILABLE" },
]);
const completed = await db.query(
  "select reloo_complete_auth_profile($1,'google@example.invalid','Google User','0831234567','both',null,'UNAVAILABLE',$2,null) as result",
  [googleId, sourceResults],
);
assert.equal(completed.rows[0].result.activation_status, "PENDING");
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from risk_cases where profile_id=$1",
      [googleId],
    )
  ).rows[0].count,
  1,
);
await assert.rejects(() =>
  db.query("select reloo_assert_active($1)", [googleId]),
);
await db.query(
  "select reloo_add_phone_signal('admin','0831234567','verified_review','https://example.com/scam-report','Verified fresh evidence of a matching phone',now()+interval '1 day')",
);
const repeat = await db.query(
  "select reloo_complete_auth_profile($1,'google@example.invalid','Changed Name','0909999999','lender',null,'UNAVAILABLE',$2,null) as result",
  [googleId, sourceResults],
);
assert.equal(repeat.rows[0].result.already_complete, true);
assert.equal(repeat.rows[0].result.activation_status, "RESTRICTED");
assert.equal(
  (await db.query("select phone from profiles where id=$1", [googleId])).rows[0]
    .phone,
  "0831234567",
);
const failedId = "00000000-0000-4000-8000-000000000021";
await assert.rejects(() =>
  db.query(
    "select reloo_complete_auth_profile($1,'rollback@example.invalid','Rollback User','0912345678','both',null,'INVALID', '[]',null)",
    [failedId],
  ),
);
assert.equal(
  (
    await db.query("select count(*)::int as count from profiles where id=$1", [
      failedId,
    ])
  ).rows[0].count,
  0,
);
await db.exec("set role authenticated");
await assert.rejects(() =>
  db.query(
    "select reloo_complete_auth_profile($1,'evil@example.invalid','Evil User','0912345678','both',null,'UNKNOWN','[]',null)",
    [failedId],
  ),
);
await db.exec("reset role");
console.log(
  "Auth onboarding SQL passed: pending Google profiles, atomic audit/case creation, idempotency, restriction preservation, rollback and RPC permissions.",
);
await db.query("select reloo_admin_market_write('admin','source',$1)", [
  JSON.stringify({
    id: "chotot",
    enabled: true,
    access_basis: "Reviewed public URL access within robots and source terms",
  }),
]);
const target = (
  await db.query(
    "select reloo_admin_market_write('admin','target',$1) as result",
    [
      JSON.stringify({
        source_id: "chotot",
        url: "https://www.chotot.com/test/1.htm",
        brand: "Apple",
        model: "iPhone 15",
        variant: "128GB",
        model_key: "apple|iphone 15|128gb",
        category: "dien-thoai",
        price_kind: "used_asking",
        condition: "good",
        permission_note: "Exact product and condition reviewed",
        interval_minutes: 360,
      }),
    ],
  )
).rows[0].result.targetId;
const claimed = await db.query("select * from reloo_claim_price_target()");
assert.equal(claimed.rows[0].id, target);
assert.equal(
  (await db.query("select * from reloo_claim_price_target()")).rowCount,
  0,
);
await db.query(
  "update price_targets set lease_until=now()-interval '1 second' where id=$1",
  [target],
);
assert.equal(
  (await db.query("select * from reloo_claim_price_target()")).rows[0].id,
  target,
);
await db.query("select reloo_finish_price_target($1,'SUCCESS',null,$2)", [
  target,
  JSON.stringify({
    title: "Apple iPhone 15 128GB",
    description: "Public product description",
    url: "https://www.chotot.com/test/1.htm",
    price: 5000000,
    condition: "good",
    in_stock: true,
    content_hash: "testhash",
  }),
]);
assert.equal(
  (await db.query("select count(*)::int count from price_snapshots")).rows[0]
    .count,
  1,
);
assert.equal(
  (await db.query("select * from reloo_claim_price_target()")).rowCount,
  0,
);
await assert.rejects(() =>
  db.query("select reloo_finish_price_target($1,'SUCCESS',null,$2)", [
    target,
    JSON.stringify({
      title: "Invalid",
      url: "https://www.chotot.com/test/1.htm",
      price: -1,
      condition: "good",
      in_stock: true,
    }),
  ]),
);
assert.equal(
  (await db.query("select count(*)::int count from price_collection_runs"))
    .rows[0].count,
  1,
);
await assert.rejects(() =>
  db.query("select reloo_admin_market_write('lender','source',$1)", [
    JSON.stringify({
      id: "chotot",
      enabled: true,
      access_basis: "Reviewed public access",
    }),
  ]),
);
await db.exec("set role authenticated");
await assert.rejects(() => db.query("select * from price_snapshots"));
await assert.rejects(() => db.query("select reloo_claim_price_target()"));
await db.exec("reset role");
console.log(
  "Market data SQL passed: idempotent schema, administrator gate, queue lease, atomic snapshot/run writes, rollback and restricted grants.",
);
await db.exec("alter table profiles add column profile_data jsonb default '{}'; alter table profiles add column kyc_level text default 'L0';");
await db.exec(await readFile(new URL('../supabase/migrations/20261010010000_operations.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../deploy/vietnam/staff-review.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../deploy/vietnam/devices.sql', import.meta.url), 'utf8'));
await db.exec("insert into crm_staff(profile_id,role,permissions) values('admin','owner',array['*']); insert into profiles(id,name,phone,activation_status,screening_valid_until) values('multi-risk','Fixture','0912345678','ACTIVE',now()+interval '1 day');");
const riskIdentifier = (await db.query("insert into risk_identifiers(profile_id,kind,bank_code,value_hash,value_encrypted,masked_value) values('multi-risk','BANK','VCB','fixture-bank-hash','fixture-encrypted','***2771') returning id")).rows[0].id;
await assert.rejects(() => db.query("select reloo_screen_identifier($1,'MATCH','[]',now()+interval '1 day')", [riskIdentifier]));
await db.query("select reloo_screen_identifier($1,'MATCH',$2,now()+interval '1 day')", [riskIdentifier, JSON.stringify([{ source: 'isolated_fixture', status: 'MATCH', evidence: [{ note: 'Explicit fixture evidence' }] }])]);
assert.equal((await db.query("select activation_status from profiles where id='multi-risk'")).rows[0].activation_status, 'RESTRICTED');
await assert.rejects(() => db.query("select reloo_profile_update('multi-risk','{\"name\":\"Forbidden edit\"}')"));
const blacklistEntry = (await db.query("select id from risk_blacklist where profile_id='multi-risk'")).rows[0].id;
await assert.rejects(() => db.query("select reloo_blacklist_decision('renter',$1,'CLEARED','Fixture identity and ownership checked','[{}]')", [blacklistEntry]));
await db.query("select reloo_blacklist_decision('admin',$1,'CLEARED','Fixture identity and ownership checked','[{\"note\":\"Fixture review\"}]')", [blacklistEntry]);
await assert.rejects(() => db.query("select reloo_assert_active('multi-risk')"));
const multiCase = (await db.query("select id from risk_cases where profile_id='multi-risk'")).rows[0].id;
await db.query("select reloo_review_case('admin',$1,'CLEAR','Fixture identity and ownership checked','[{\"url\":\"https://fixture.example/evidence\",\"note\":\"Isolated fixture evidence reviewed\"}]',720)", [multiCase]);
await db.query("select reloo_assert_active('multi-risk')");
assert.equal((await db.query("select status from risk_identifiers where id=$1", [riskIdentifier])).rows[0].status, 'MATCH');
await assert.rejects(() => db.query("insert into risk_blacklist(profile_id,kind,value_hash,reason,expires_at) values('multi-risk','IP','fixture-ip','Invalid indefinite IP ban',now()+interval '2 days')"));
await db.exec("set role authenticated");
await assert.rejects(() => db.query("select * from risk_identifiers"));
await assert.rejects(() => db.query("select reloo_claim_job()"));
await db.exec("reset role");
console.log('Operations SQL passed: evidence gates, atomic restriction, profile lock, staff-only clearance, independent case review, preservation of MATCH, IP lifetime and private grants.');
await db.exec(await readFile(new URL('../deploy/vietnam/crm-transactions.sql', import.meta.url), 'utf8'));
await assert.rejects(() => db.query("select reloo_crm_save('renter',null,null,'content','Not allowed','DRAFT','{}')"));
const scheduledContent = (await db.query("select * from reloo_crm_save('admin',null,null,'content','Isolated SQL fixture','SCHEDULED',jsonb_build_object('publishAt',now()+interval '1 hour'))" )).rows[0];
assert.equal((await db.query("select count(*)::int n from automation_jobs where payload->>'recordId'=$1", [scheduledContent.id])).rows[0].n, 1);
await assert.rejects(() => db.query("select reloo_crm_save('admin',$1,999,'content','Stale version','DRAFT','{}')", [scheduledContent.id]));
await assert.rejects(() => db.query("select reloo_staff_set('admin','admin','owner',array['*'],false,'Self access removal must be denied')"));
console.log('CRM SQL passed: backend permission gate, transactional schedule/audit, optimistic concurrency and self-permission protection.');
await db.exec(await readFile(new URL('../deploy/vietnam/screening-retry.sql', import.meta.url), 'utf8'));
const initialRetry = (await db.query("select * from reloo_request_identifier_check('multi-risk',$1)", [riskIdentifier])).rows[0];
assert.equal(initialRetry.queued, true);
const duplicateRetry = (await db.query("select * from reloo_request_identifier_check('multi-risk',$1)", [riskIdentifier])).rows[0];
assert.equal(duplicateRetry.queued, false);
assert.equal(duplicateRetry.job_id, initialRetry.job_id);
await assert.rejects(() => db.query("select * from reloo_request_identifier_check('renter',$1)", [riskIdentifier]));
await db.query("update automation_jobs set status='DONE',result='{\"status\":\"UNAVAILABLE\"}' where id=$1", [initialRetry.job_id]);
assert.equal((await db.query("select * from reloo_request_identifier_check('multi-risk',$1)", [riskIdentifier])).rows[0].queued, false);
await db.query("update automation_jobs set created_at=now()-interval '16 minutes' where id=$1", [initialRetry.job_id]);
assert.equal((await db.query("select * from reloo_request_identifier_check('multi-risk',$1)", [riskIdentifier])).rows[0].queued, true);
assert.equal((await db.query("select status from risk_identifiers where id=$1", [riskIdentifier])).rows[0].status, 'MATCH');
await db.exec('set role authenticated');
await assert.rejects(() => db.query("select * from reloo_request_identifier_check('multi-risk',$1)", [riskIdentifier]));
await db.exec('reset role');
console.log('Screening retry SQL passed: atomic deduplication, ownership, cooldown, unavailable-result retry, preserved evidence and service-only grants.');
await db.exec(await readFile(new URL('../deploy/vietnam/phone-clearance.sql', import.meta.url), 'utf8'));
const policyResult = [
  { source: 'checkscam', status: 'UNAVAILABLE', httpStatus: 403 },
  { source: 'chongluadao', status: 'NO_MATCH', complete: true, matchedInput: true, scope: 'phone_warning_cards', policy: 'CLD_NOT_FOUND_V1', checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now()+3600000).toISOString(), sourceUrl: 'https://chongluadao.vn/analyze/?q=0912345678&type=misc&mode=standard' },
];
async function policyFixture(id, phone = '0912345678', results = policyResult) {
  await db.query("insert into profiles(id,name,phone,activation_status) values($1,'Isolated phone policy fixture',$2,'PENDING')", [id, phone]);
  return (await db.query("insert into risk_identifiers(profile_id,kind,value_hash,value_encrypted,masked_value,status,source_results,checked_at) values($1,'PHONE',$1,'fixture-encrypted','***5678','NO_MATCH',$2,now()) returning id", [id,JSON.stringify(results)])).rows[0].id;
}
const acceptedIdentifier = await policyFixture('policy-accepted');
await db.query("insert into risk_cases(profile_id,reason) values('policy-accepted','UNAVAILABLE')");
assert.equal((await db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2) result", [acceptedIdentifier, JSON.stringify(policyResult)])).rows[0].result.activated, true);
assert.equal((await db.query("select activation_status,verification_method from profiles where id='policy-accepted'")).rows[0].verification_method, 'CLD_NOT_FOUND_V1');
assert.equal((await db.query("select status from risk_cases where profile_id='policy-accepted'")).rows[0].status, 'CLEARED');
await db.query("select reloo_assert_active('policy-accepted')");
const changedIdentifier = await policyFixture('policy-changed', '0987654321');
assert.equal((await db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2) result", [changedIdentifier, JSON.stringify(policyResult)])).rows[0].result.activated, false);
const restrictedIdentifier = await policyFixture('policy-restricted');
await db.query("update profiles set activation_status='RESTRICTED' where id='policy-restricted'");
assert.equal((await db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2) result", [restrictedIdentifier, JSON.stringify(policyResult)])).rows[0].result.activated, false);
const warningIdentifier = await policyFixture('policy-warning');
await db.query("insert into risk_cases(profile_id,reason) values('policy-warning','IDENTIFIER_MATCH')");
assert.equal((await db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2) result", [warningIdentifier, JSON.stringify(policyResult)])).rows[0].result.activated, false);
const blockedIdentifier = await policyFixture('policy-blacklist');
await db.query("insert into risk_blacklist(profile_id,kind,reason) values('policy-blacklist','BANK','Isolated independent warning')");
assert.equal((await db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2) result", [blockedIdentifier, JSON.stringify(policyResult)])).rows[0].result.activated, false);
const staleResults = policyResult.map((result) => result.source === 'chongluadao' ? { ...result, expiresAt: '2000-01-01T00:00:00Z' } : result);
const staleIdentifier = await policyFixture('policy-stale', '0912345678', staleResults);
await assert.rejects(() => db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2)", [staleIdentifier,JSON.stringify(staleResults)]));
const matchResults = [...policyResult, { source: 'checkscam', status: 'MATCH', evidence: [{ note: 'Isolated fixture warning' }] }];
const matchIdentifier = await policyFixture('policy-positive', '0912345678', matchResults);
await assert.rejects(() => db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2)", [matchIdentifier,JSON.stringify(matchResults)]));
await db.exec('set role authenticated');
await assert.rejects(() => db.query("select reloo_confirm_phone_lookup($1,'0912345678',$2)", [acceptedIdentifier, JSON.stringify(policyResult)]));
await db.exec('reset role');
console.log('Phone policy SQL passed: CLD acceptance despite blocked CheckScam, evidence/case audit, current phone binding, expiry, independent restrictions and service-only access.');
await db.exec("alter table assets add column category text; alter table assets add column specs jsonb;");
await db.exec(await readFile(new URL('../deploy/vietnam/listing-required.sql', import.meta.url), 'utf8'));
const validSpecs = { brand: 'Sony', model: 'A7IV', sensor: '33MP', accessories: 'Pin và thẻ nhớ' };
await assert.rejects(() => db.query("insert into assets(id,owner_id,category,specs) values('invalid-category','policy-accepted','', $1)", [JSON.stringify(validSpecs)]));
await assert.rejects(() => db.query("insert into assets(id,owner_id,category,specs) values('missing-specs','policy-accepted','may-anh','{}')"));
await db.query("insert into assets(id,owner_id,category,specs) values('valid-specs','policy-accepted','may-anh', $1)", [JSON.stringify(validSpecs)]);
await assert.rejects(() => db.query("update assets set specs='{}' where id='valid-specs'"));
await db.query("update assets set status='paused' where id='valid-specs'");
console.log('Listing SQL passed: required category/specs on insert and edit, rollback and compatible status transitions.');
await db.close();
