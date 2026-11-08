create table public.account_access_devices (
  id uuid primary key default gen_random_uuid(), profile_id text not null references profiles(id),
  device_hash text not null, ip_hash text, observed_at timestamptz not null default now(), expires_at timestamptz not null,
  unique(profile_id,device_hash)
);
alter table public.account_access_devices enable row level security;
revoke all on public.account_access_devices from anon,authenticated;
grant all on public.account_access_devices to service_role;
alter table public.risk_blacklist add constraint risk_ip_lifetime check(kind<>'IP' or expires_at<=created_at+interval '24 hours');
notify pgrst,'reload schema';
