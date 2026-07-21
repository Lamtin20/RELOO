-- RELOO — App extensions (chat, CRM, notifications, FAQ, reviews, wallet)
-- Chạy sau migration initial_schema

-- ─── Chat ────────────────────────────────────────────────────────────────────

create table if not exists public.chat_threads (
  id text primary key,
  thread_type text not null default 'inquiry'
    check (thread_type in ('inquiry', 'order')),
  listing_id text references public.assets(id) on delete set null,
  transaction_id text references public.transactions(id) on delete set null,
  lender_id text not null references public.profiles(id) on delete cascade,
  buyer_id text not null references public.profiles(id) on delete cascade,
  thread_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_threads_lender_idx on public.chat_threads(lender_id);
create index if not exists chat_threads_buyer_idx on public.chat_threads(buyer_id);

create trigger chat_threads_set_updated_at
  before update on public.chat_threads
  for each row execute function public.set_updated_at();

create table if not exists public.chat_messages (
  id text primary key,
  thread_id text not null references public.chat_threads(id) on delete cascade,
  sender_id text not null,
  message_type text not null default 'text'
    check (message_type in ('text', 'system', 'image', 'audio')),
  body text,
  message_data jsonb not null default '{}',
  read_by jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx on public.chat_messages(thread_id);
create index if not exists chat_messages_created_idx on public.chat_messages(created_at desc);

-- ─── Notifications ───────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'info',
  link text,
  is_read boolean not null default false,
  notification_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_unread_idx on public.notifications(user_id, is_read);

-- ─── CRM: Leads ──────────────────────────────────────────────────────────────

create table if not exists public.crm_leads (
  id text primary key,
  name text not null,
  phone text,
  email text,
  source text,
  interest text,
  status text not null default 'new',
  notes text,
  assigned_to text references public.profiles(id) on delete set null,
  lead_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger crm_leads_set_updated_at
  before update on public.crm_leads
  for each row execute function public.set_updated_at();

-- ─── Support tickets ─────────────────────────────────────────────────────────

create table if not exists public.support_tickets (
  id text primary key,
  subject text not null,
  description text,
  user_id text references public.profiles(id) on delete set null,
  transaction_id text references public.transactions(id) on delete set null,
  status text not null default 'open',
  priority text not null default 'medium',
  category text,
  assignee text,
  ticket_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_user_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table if not exists public.ticket_messages (
  id text primary key,
  ticket_id text not null references public.support_tickets(id) on delete cascade,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_idx on public.ticket_messages(ticket_id);

-- ─── Risk alerts ─────────────────────────────────────────────────────────────

create table if not exists public.risk_alerts (
  id text primary key,
  alert_type text not null,
  severity text not null default 'medium',
  user_id text references public.profiles(id) on delete set null,
  transaction_id text references public.transactions(id) on delete set null,
  asset_id text references public.assets(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open',
  alert_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists risk_alerts_status_idx on public.risk_alerts(status);

-- ─── FAQ ─────────────────────────────────────────────────────────────────────

create table if not exists public.faq_items (
  id text primary key,
  category text not null default 'general',
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger faq_items_set_updated_at
  before update on public.faq_items
  for each row execute function public.set_updated_at();

-- ─── Listing reviews ─────────────────────────────────────────────────────────

create table if not exists public.listing_reviews (
  id text primary key default gen_random_uuid()::text,
  asset_id text not null references public.assets(id) on delete cascade,
  reviewer_id text not null references public.profiles(id) on delete cascade,
  transaction_id text references public.transactions(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text,
  created_at timestamptz not null default now()
);

create index if not exists listing_reviews_asset_idx on public.listing_reviews(asset_id);

-- ─── Wallet / thu nhập cho thuê ──────────────────────────────────────────────

create table if not exists public.wallet_ledger (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  entry_type text not null
    check (entry_type in ('rental_income', 'withdrawal', 'fee', 'refund', 'adjustment')),
  amount bigint not null,
  balance_after bigint,
  reference_id text,
  description text,
  ledger_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_idx on public.wallet_ledger(user_id);

-- ─── Customer CRM (bank / audit) ─────────────────────────────────────────────

create table if not exists public.customer_profiles (
  id text primary key,
  user_id text unique references public.profiles(id) on delete cascade,
  customer_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.customer_bank_accounts (
  id text primary key default gen_random_uuid()::text,
  customer_id text not null references public.customer_profiles(id) on delete cascade,
  bank_code text,
  account_number text,
  account_name text,
  is_primary boolean not null default false,
  account_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.customer_audit_logs (
  id text primary key default gen_random_uuid()::text,
  customer_id text not null references public.customer_profiles(id) on delete cascade,
  action text not null,
  actor_id text,
  log_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Session replays (Trust Platform) ────────────────────────────────────────

create table if not exists public.session_replay_events (
  replay_event_id text primary key default gen_random_uuid()::text,
  session_id text not null,
  user_id text references public.profiles(id) on delete set null,
  event_type text not null,
  screen text,
  payload jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create index if not exists session_replay_session_idx on public.session_replay_events(session_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.crm_leads enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.risk_alerts enable row level security;
alter table public.faq_items enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_bank_accounts enable row level security;
alter table public.customer_audit_logs enable row level security;
alter table public.session_replay_events enable row level security;

create policy "public_read_faq"
  on public.faq_items for select
  using (published = true);

create policy "public_read_reviews"
  on public.listing_reviews for select
  using (true);

create policy "users_read_own_notifications"
  on public.notifications for select
  using (
    user_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  );

-- Cập nhật schema version
update public.platform_settings
set schema_version = '2026.07.18-ext', updated_at = now()
where id = 'default';
