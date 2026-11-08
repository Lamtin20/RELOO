create table if not exists public.customer_va_links(id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),bank_account_id text not null,provider_va_id text unique,provider_order_id text unique,va_encrypted text not null,va_hash text not null unique,masked_va text not null,bank_name text not null,holder_encrypted text,status text not null default 'ACTIVE',expires_at timestamptz,created_by text references profiles(id),created_at timestamptz default now());
create table if not exists public.sepay_order_requests(id uuid primary key,profile_id text not null references profiles(id),bank_account_id text not null,order_code text not null unique,expected_amount bigint not null check(expected_amount>0),payload_encrypted text not null,status text not null default 'PROCESSING' check(status in ('PROCESSING','CREATED','REVIEW')),provider_order_id text,created_by text references profiles(id),created_at timestamptz default now());
create table if not exists public.customer_cash_entries(id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),source_id uuid not null unique references finance_sources(id),direction text not null check(direction in ('IN','OUT')),amount bigint not null check(amount>0),reference text not null,occurred_at timestamptz not null,created_at timestamptz default now());
do $$ declare t text;begin foreach t in array array['customer_va_links','sepay_order_requests','customer_cash_entries'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
drop trigger if exists cash_entry_immutable on public.customer_cash_entries;
create trigger cash_entry_immutable before update or delete on public.customer_cash_entries for each row execute function public.reloo_immutable_record();
create or replace function public.reloo_check_cash_entry() returns trigger language plpgsql as $$
begin
  if not exists(select 1 from finance_sources where id=new.source_id and amount=new.amount and direction=new.direction and occurred_at=new.occurred_at) then raise exception 'CASH_SOURCE_MISMATCH';end if;
  return new;
end $$;
drop trigger if exists cash_entry_check on public.customer_cash_entries;
create trigger cash_entry_check before insert on public.customer_cash_entries for each row execute function public.reloo_check_cash_entry();
create or replace function public.reloo_cash_summary(p_profile text) returns jsonb language sql security definer set search_path=public as $$
select jsonb_build_object('incoming',coalesce(sum(amount) filter(where direction='IN'),0)::text,'outgoing',coalesce(sum(amount) filter(where direction='OUT'),0)::text,'net',(coalesce(sum(amount) filter(where direction='IN'),0)-coalesce(sum(amount) filter(where direction='OUT'),0))::text,'count',count(*)) from customer_cash_entries where profile_id=p_profile;
$$;
create or replace function public.reloo_attribute_cash(p_source uuid,p_profile text,p_reference text) returns void language plpgsql security definer set search_path=public as $$
declare item finance_sources;
begin
  select * into item from finance_sources where id=p_source;if not found then raise exception 'VERIFIED_SOURCE_REQUIRED';end if;
  if not exists(select 1 from customer_va_links where profile_id=p_profile and bank_account_id=item.bank_account_id) then raise exception 'VA_LINK_REQUIRED';end if;
  insert into customer_cash_entries(profile_id,source_id,direction,amount,reference,occurred_at) values(p_profile,item.id,item.direction,item.amount,p_reference,item.occurred_at) on conflict(source_id) do nothing;
  if exists(select 1 from customer_cash_entries where source_id=p_source and profile_id<>p_profile) then raise exception 'CASH_ATTRIBUTION_CONFLICT';end if;
end $$;
revoke all on function public.reloo_cash_summary(text),public.reloo_attribute_cash(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reloo_cash_summary(text),public.reloo_attribute_cash(uuid,text,text) to service_role;
notify pgrst,'reload schema';
