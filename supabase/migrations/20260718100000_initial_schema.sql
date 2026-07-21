-- RELOO Trust Platform — Initial Supabase schema
-- Chạy trong Supabase Dashboard → SQL Editor
-- Hoặc: supabase db push (nếu dùng Supabase CLI)

create extension if not exists "pgcrypto";

-- ─── Helpers ───────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.chronicle_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Chronicle is immutable (R009): % not allowed on chronicle', tg_op;
end;
$$;

-- ─── Profiles ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  phone text,
  name text not null,
  avatar_url text,
  role text not null default 'renter'
    check (role in ('admin', 'lender', 'renter', 'both')),
  kyc_level text not null default 'L0',
  trust_score integer not null default 0
    check (trust_score >= 0 and trust_score <= 1000),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'banned')),
  profile_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── Identity (eKYC) ───────────────────────────────────────────────────────

create table if not exists public.identity_profiles (
  id text primary key,
  user_id text not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'expired')),
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  cccd_hash text,
  ocr_verified boolean not null default false,
  face_match_verified boolean not null default false,
  verified_at timestamptz,
  checks jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger identity_profiles_set_updated_at
  before update on public.identity_profiles
  for each row execute function public.set_updated_at();

-- ─── Assets (listings) ─────────────────────────────────────────────────────

create table if not exists public.assets (
  id text primary key,
  owner_id text not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  category text not null,
  daily_price bigint not null check (daily_price >= 0),
  market_value bigint not null check (market_value >= 0),
  location text,
  location_details jsonb not null default '{}',
  images jsonb not null default '[]',
  specs jsonb not null default '{}',
  condition text,
  status text not null default 'available'
    check (status in ('available', 'rented', 'paused', 'removed')),
  is_locked boolean not null default false,
  dispute_status text,
  trust_badges jsonb not null default '[]',
  labels jsonb not null default '[]',
  rating numeric(4, 2),
  review_count integer not null default 0,
  view_count integer not null default 0,
  is_boosted boolean not null default false,
  listing_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_owner_id_idx on public.assets(owner_id);
create index if not exists assets_category_idx on public.assets(category);
create index if not exists assets_status_idx on public.assets(status);

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- ─── NFT Passport ──────────────────────────────────────────────────────────

create table if not exists public.asset_passports (
  id text primary key,
  asset_id text not null unique references public.assets(id) on delete cascade,
  nft_token_id text not null,
  chain_hash text,
  audit_count integer not null default 0,
  residual_value bigint,
  minted_at timestamptz,
  passport_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Transactions (orders) ─────────────────────────────────────────────────

create table if not exists public.transactions (
  id text primary key,
  asset_id text not null references public.assets(id) on delete restrict,
  renter_id text not null references public.profiles(id) on delete restrict,
  lender_id text not null references public.profiles(id) on delete restrict,
  status text not null default 'pending',
  days integer not null check (days > 0),
  daily_price bigint not null,
  rental_total bigint not null default 0,
  platform_fee bigint not null default 0,
  reloo_care_fee bigint not null default 0,
  reloo_care_plan text,
  deposit_amount bigint not null default 0,
  shipping_fee bigint not null default 0,
  grand_total bigint not null default 0,
  start_date date,
  end_date date,
  decision_id text,
  trust_score_snapshot integer,
  risk_score_snapshot integer,
  order_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_asset_id_idx on public.transactions(asset_id);
create index if not exists transactions_renter_id_idx on public.transactions(renter_id);
create index if not exists transactions_lender_id_idx on public.transactions(lender_id);
create index if not exists transactions_status_idx on public.transactions(status);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ─── Transaction timeline ──────────────────────────────────────────────────

create table if not exists public.transaction_timelines (
  id text primary key default gen_random_uuid()::text,
  transaction_id text not null references public.transactions(id) on delete cascade,
  status text not null,
  note text,
  recorded_at timestamptz not null default now()
);

create index if not exists transaction_timelines_tx_idx
  on public.transaction_timelines(transaction_id);

-- ─── Chronicle (INSERT ONLY — R009) ────────────────────────────────────────

create table if not exists public.chronicle (
  chronicle_id text primary key default gen_random_uuid()::text,
  type text not null
    check (type in ('USER', 'ASSET', 'TRANSACTION', 'BEHAVIOR', 'AI', 'DISPUTE', 'RULE')),
  entity_id text,
  user_id text references public.profiles(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}',
  before_state jsonb,
  after_state jsonb,
  rule_id text,
  decision_id text,
  recorded_at timestamptz not null default now()
);

create index if not exists chronicle_entity_idx on public.chronicle(entity_id);
create index if not exists chronicle_user_idx on public.chronicle(user_id);
create index if not exists chronicle_recorded_at_idx on public.chronicle(recorded_at desc);

create trigger chronicle_immutable_guard
  before update or delete on public.chronicle
  for each row execute function public.chronicle_immutable();

-- ─── Green Audit events (hash immutable — R008) ────────────────────────────

create table if not exists public.audit_events (
  id text primary key default gen_random_uuid()::text,
  transaction_id text not null references public.transactions(id) on delete restrict,
  audit_type text not null check (audit_type in ('pickup', 'return')),
  hash_sha256 text not null,
  gps jsonb,
  recorded_at timestamptz not null default now()
);

-- ─── Behavior logs ───────────────────────────────────────────────────────────

create table if not exists public.behavior_logs (
  log_id text primary key default gen_random_uuid()::text,
  event_id text,
  user_id text references public.profiles(id) on delete set null,
  session_id text,
  device_id text,
  action text not null,
  module text,
  screen text,
  old_value jsonb,
  new_value jsonb,
  trust_score integer,
  risk_score integer,
  fraud_score integer,
  decision_id text,
  rule_id text,
  metadata jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create index if not exists behavior_logs_user_idx on public.behavior_logs(user_id);
create index if not exists behavior_logs_recorded_at_idx on public.behavior_logs(recorded_at desc);

-- ─── Decision logs ───────────────────────────────────────────────────────────

create table if not exists public.decision_logs (
  decision_id text primary key,
  outcome text not null,
  user_id text references public.profiles(id) on delete set null,
  entity_id text,
  reasons jsonb not null default '[]',
  trust_score integer,
  risk_score integer,
  fraud_score integer,
  final_deposit bigint,
  ai_explainable_log jsonb,
  created_at timestamptz not null default now()
);

-- ─── CMS ─────────────────────────────────────────────────────────────────────

create table if not exists public.cms_pages (
  id text primary key,
  title text not null,
  slug text unique not null,
  meta_description text,
  content text not null default '',
  published boolean not null default false,
  page_data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger cms_pages_set_updated_at
  before update on public.cms_pages
  for each row execute function public.set_updated_at();

-- ─── Platform settings (singleton) ─────────────────────────────────────────

create table if not exists public.platform_settings (
  id text primary key default 'default',
  schema_version text not null default '2026.07.18',
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id, schema_version, settings)
values ('default', '2026.07.18', '{}')
on conflict (id) do nothing;

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.identity_profiles enable row level security;
alter table public.assets enable row level security;
alter table public.asset_passports enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_timelines enable row level security;
alter table public.chronicle enable row level security;
alter table public.audit_events enable row level security;
alter table public.behavior_logs enable row level security;
alter table public.decision_logs enable row level security;
alter table public.cms_pages enable row level security;
alter table public.platform_settings enable row level security;

-- Marketplace: đọc tài sản đang cho thuê
create policy "public_read_available_assets"
  on public.assets for select
  using (status = 'available');

create policy "public_read_asset_passports"
  on public.asset_passports for select
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_passports.asset_id and a.status = 'available'
    )
  );

-- CMS trang đã xuất bản
create policy "public_read_published_cms"
  on public.cms_pages for select
  using (published = true);

-- Profile: user xem/sửa bản thân (khi gắn auth.users)
create policy "users_read_own_profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

create policy "users_update_own_profile"
  on public.profiles for update
  using (auth.uid() = auth_user_id);

-- Chronicle: chỉ insert qua service role / backend (không policy insert cho anon)
create policy "deny_chronicle_select_anon"
  on public.chronicle for select
  using (false);

-- Service role bypass RLS tự động khi dùng SUPABASE_SERVICE_ROLE_KEY

comment on table public.chronicle is 'Immutable event store — INSERT ONLY (R009)';
comment on table public.audit_events is 'Green Audit — hash không sửa sau insert (R008)';
