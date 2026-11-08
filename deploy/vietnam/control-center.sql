-- Additive migration. Apply to approved test/staging first, then security-lockdown.sql.
begin;
create table if not exists public.operations_heartbeats (
 id text primary key check(id in ('operations')),
 seen_at timestamptz not null default now(),
 modules text[] not null default '{}' check(modules <@ array['calendar','neighborhood','personalization']::text[])
);
alter table public.operations_heartbeats enable row level security;
revoke all on public.operations_heartbeats from public, anon, authenticated;
grant select,insert,update,delete on public.operations_heartbeats to service_role;
commit;
