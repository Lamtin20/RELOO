create table if not exists public.sepay_virtual_accounts (
  id uuid primary key default gen_random_uuid(),profile_id text not null references public.profiles(id),
  bank_account_id text not null,provider_order_id text not null unique,va_encrypted text not null,masked_va text not null,
  expected_amount bigint not null check(expected_amount>0 and expected_amount<=9007199254740991),expires_at timestamptz not null,
  created_by text not null references public.profiles(id),created_at timestamptz not null default now()
);
alter table public.sepay_virtual_accounts enable row level security;
revoke all on public.sepay_virtual_accounts from anon,authenticated;
grant all on public.sepay_virtual_accounts to service_role;
notify pgrst,'reload schema';
create table if not exists public.sepay_va_requests (
  provider_order_id text primary key,profile_id text not null references public.profiles(id),
  amount bigint not null,status text not null default 'PROCESSING' check(status in ('PROCESSING','CREATED','REVIEW')),
  created_by text not null references public.profiles(id),created_at timestamptz not null default now()
);
alter table public.sepay_va_requests enable row level security;
revoke all on public.sepay_va_requests from anon,authenticated;
grant all on public.sepay_va_requests to service_role;
create or replace function public.reloo_claim_va(p_actor text,p_order text,p_profile text,p_amount bigint) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
  if p_amount<=0 or p_amount>9007199254740991 then raise exception 'INVALID_AMOUNT';end if;
  insert into sepay_va_requests(provider_order_id,profile_id,amount,created_by) values(p_order,p_profile,p_amount,p_actor) on conflict do nothing;
  return found;
end $$;
revoke all on function public.reloo_claim_va(text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reloo_claim_va(text,text,text,bigint) to service_role;
notify pgrst,'reload schema';
