create table if not exists public.sepay_sync_state(bank_account_id text primary key,cursor_id text,last_checked_at timestamptz,last_result text);
alter table public.sepay_sync_state enable row level security;
revoke all on public.sepay_sync_state from anon,authenticated;
grant all on public.sepay_sync_state to service_role;
create or replace function public.reloo_va_customer_ready() returns trigger language plpgsql as $$
begin
  perform reloo_assert_active(new.profile_id);
  if not exists(select 1 from verified_identities where profile_id=new.profile_id and expires_at>now()) then raise exception 'VALID_IDENTITY_REQUIRED';end if;
  return new;
end $$;
drop trigger if exists va_customer_ready on public.customer_va_links;
create trigger va_customer_ready before insert on public.customer_va_links for each row execute function public.reloo_va_customer_ready();
drop trigger if exists va_request_customer_ready on public.sepay_order_requests;
create trigger va_request_customer_ready before insert on public.sepay_order_requests for each row execute function public.reloo_va_customer_ready();
notify pgrst,'reload schema';
