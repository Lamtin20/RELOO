import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
export async function setup() {
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
    "promotions",
    "promotion-payments",
    "promotion-wallet",
    "promotion-invoices",
    "promotion-deletion",
    "promotion-funding-ledger",
    "promotion-public",
  ])
    await db.exec(
      await readFile(
        new URL("../../deploy/vietnam/" + name + ".sql", import.meta.url),
        "utf8",
      ),
    );
  return db;
}
export async function source(db, amount, profile, direction = "IN") {
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
