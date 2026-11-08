-- Additive: preserve the worker's independent loop heartbeat.
alter table public.operations_heartbeats add column if not exists observations jsonb not null default '{}'::jsonb;
alter table public.operations_heartbeats add column if not exists observed_at timestamptz;
revoke all on public.operations_heartbeats from public,anon,authenticated;
grant select,insert,update on public.operations_heartbeats to service_role;
