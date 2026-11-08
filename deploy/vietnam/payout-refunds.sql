alter table cashflow_payout_credits drop constraint if exists cashflow_payout_credits_source_code_check;
alter table cashflow_payout_credits add constraint cashflow_payout_credits_source_code_check check(source_code in ('BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK'));
alter table wallet_withdrawal_records drop constraint if exists wallet_withdrawal_records_source_code_check;
alter table wallet_withdrawal_records add constraint wallet_withdrawal_records_source_code_check check(source_code in ('BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK'));
alter table wallet_category_events drop constraint if exists wallet_category_events_source_code_check;
alter table wallet_category_events add constraint wallet_category_events_source_code_check check(source_code in ('BANK','RENTAL','DEPOSIT','REFUND'));
create table if not exists cashflow_payout_credits (
 id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),source_code text not null check(source_code in ('BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK')),amount bigint not null check(amount>0 and amount<=9007199254740991),funding_source_id uuid not null references finance_sources(id),reason text not null check(length(trim(reason)) between 20 and 2000),created_by text not null references profiles(id),created_at timestamptz not null default now()
);
alter table cashflow_payout_credits enable row level security;
revoke all on cashflow_payout_credits from anon,authenticated;
grant all on cashflow_payout_credits to service_role;
create index if not exists payout_credit_customer on cashflow_payout_credits(profile_id,source_code);
drop trigger if exists payout_credit_immutable on cashflow_payout_credits;
create trigger payout_credit_immutable before update or delete on cashflow_payout_credits for each row execute function reloo_immutable_record();
alter table wallet_withdrawal_records add column if not exists request_key uuid unique;
alter table wallet_withdrawal_records add column if not exists bank_snapshot_encrypted text;
alter table wallet_withdrawal_records add column if not exists bank_account_hash text;
alter table wallet_withdrawal_records add column if not exists destination_bank_id uuid;
alter table wallet_withdrawal_records add column if not exists holder_snapshot_encrypted text;
alter table wallet_withdrawal_records add column if not exists approved_by text references profiles(id);
alter table wallet_withdrawal_records add column if not exists reviewed_at timestamptz;
create table if not exists cashflow_payout_events(id uuid primary key default gen_random_uuid(),withdrawal_id uuid not null references wallet_withdrawal_records(id),actor_id text not null references profiles(id),status text not null,reason text,created_at timestamptz not null default clock_timestamp());
alter table cashflow_payout_events enable row level security;
revoke all on cashflow_payout_events from anon,authenticated;
grant all on cashflow_payout_events to service_role;
drop trigger if exists payout_event_immutable on cashflow_payout_events;
create trigger payout_event_immutable before update or delete on cashflow_payout_events for each row execute function reloo_immutable_record();
create or replace function reloo_payout_available(p_profile text,p_exclude uuid default null) returns jsonb language sql security definer set search_path=public as $$
with groups as(select unnest(array['BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK']) code), credits as(select source_code,sum(amount)::numeric n from cashflow_payout_credits where profile_id=p_profile group by source_code), used as(select source_code,sum(amount)::numeric n from wallet_withdrawal_records where profile_id=p_profile and id is distinct from p_exclude and status in ('REQUESTED','APPROVED','PROCESSING','PAID') group by source_code), bank as(select coalesce(sum(case when direction='IN' then amount else -amount end),0)::numeric n from customer_cash_entries where profile_id=p_profile), deposit as(select coalesce(sum(case when e.direction='IN' then e.amount else 0 end),0)::numeric n from customer_cash_entries e where e.profile_id=p_profile and (select source_code from wallet_category_events c where c.entry_id=e.id order by event_sequence desc limit 1)='DEPOSIT'), pending as(select coalesce(sum(amount),0)::numeric n from wallet_withdrawal_records where profile_id=p_profile and id is distinct from p_exclude and status in ('REQUESTED','APPROVED','PROCESSING')), rewards as(select upper(a.merchant) code,coalesce(sum(l.amount),0)::numeric n from cashback_ledger l join cashback_conversions c on c.id=l.conversion_id join affiliate_clicks a on a.id=c.click_id where l.profile_id=p_profile and a.profile_id=p_profile group by upper(a.merchant)), released_deposit as(select coalesce(sum(amount),0)::numeric n from cashflow_payout_credits where profile_id=p_profile and source_code='DEPOSIT'), pool as(select greatest(bank.n-greatest(deposit.n-released_deposit.n,0)-pending.n,0) n from bank,deposit,pending,released_deposit), available as(select g.code,greatest(least(coalesce(c.n,0)-coalesce(u.n,0),pool.n,case when g.code in ('SHOPEE','TIKTOK') then coalesce(r.n,0)-coalesce(u.n,0) else 9007199254740991::numeric end),0) n from groups g cross join pool left join credits c on c.source_code=g.code left join used u on u.source_code=g.code left join rewards r on r.code=g.code)
select jsonb_build_object('sources',(select jsonb_object_agg(code,n::text) from available),'total',(select least(sum(available.n),pool.n)::text from available cross join pool group by pool.n),'bankPool',(select n::text from pool));
$$;
create or replace function reloo_release_payout(p_actor text,p_profile text,p_source text,p_amount bigint,p_funding uuid,p_reason text) returns uuid language plpgsql security definer set search_path=public as $$
declare fund finance_sources;id uuid;category text;reward numeric;
begin
 if not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('payout:'||p_profile));
 select s.* into fund from finance_sources s join customer_cash_entries e on e.source_id=s.id where s.id=p_funding and e.profile_id=p_profile for update of s;
 if not found or fund.direction<>'IN' or p_amount<=0 or p_source not in ('BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK') or length(trim(p_reason)) not between 20 and 2000 then raise exception 'VERIFIED_FUNDING_REQUIRED';end if;
 select coalesce((select source_code from wallet_category_events c join customer_cash_entries e on e.id=c.entry_id where e.source_id=p_funding order by c.event_sequence desc limit 1),'BANK') into category;
 if (p_source in ('BANK','RENTAL','DEPOSIT','REFUND') and category<>p_source) or (category='DEPOSIT' and p_source<>'DEPOSIT') then raise exception 'SOURCE_CLASSIFICATION_REQUIRED';end if;
 if p_source in ('DEPOSIT','REFUND') and (exists(select 1 from rental_agreements where p_profile in (renter_id,lender_id) and status not in ('CLOSED','CANCELLED')) or exists(select 1 from transactions where p_profile in (renter_id,lender_id) and status not in ('completed','cancelled'))) then raise exception 'RENTAL_OBLIGATIONS_OPEN';end if;
 if p_amount+coalesce((select sum(amount) from cashflow_payout_credits where funding_source_id=p_funding),0)>fund.amount then raise exception 'FUNDING_ALREADY_ALLOCATED';end if;
 if p_source in ('SHOPEE','TIKTOK') then
  select coalesce(sum(l.amount),0) into reward from cashback_ledger l join cashback_conversions c on c.id=l.conversion_id join affiliate_clicks a on a.id=c.click_id where l.profile_id=p_profile and a.profile_id=p_profile and upper(a.merchant)=p_source;
  if p_amount+coalesce((select sum(amount) from cashflow_payout_credits where profile_id=p_profile and source_code=p_source),0)>reward then raise exception 'CONFIRMED_CASHBACK_REQUIRED';end if;
 end if;
 insert into cashflow_payout_credits(profile_id,source_code,amount,funding_source_id,reason,created_by) values(p_profile,p_source,p_amount,p_funding,p_reason,p_actor) returning cashflow_payout_credits.id into id;
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,p_profile,'PAYOUT_FUNDS_RELEASED',jsonb_build_object('creditId',id,'source',p_source,'amount',p_amount::text,'reason',p_reason));return id;
end $$;
create or replace function reloo_request_payout(p_profile text,p_source text,p_amount bigint,p_bank uuid,p_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare bank profile_bank_accounts;available jsonb;item wallet_withdrawal_records;new_id uuid;
begin
 perform pg_advisory_xact_lock(hashtext('payout:'||p_profile));
 select * into item from wallet_withdrawal_records where request_key=p_key;
 if found then if item.profile_id<>p_profile or item.source_code<>p_source or item.amount<>p_amount or item.destination_bank_id is distinct from p_bank then raise exception 'REQUEST_KEY_CONFLICT';end if;return item.id;end if;
 perform reloo_assert_active(p_profile);
 if not exists(select 1 from verified_identities where profile_id=p_profile and expires_at>now()) then raise exception 'VALID_IDENTITY_REQUIRED';end if;
 select * into bank from profile_bank_accounts where id=p_bank and profile_id=p_profile and name_status='DECLARED_NAME_MATCH' for share;
 if not found then raise exception 'VERIFIED_BANK_REQUIRED';end if;
 available:=reloo_payout_available(p_profile);
 if p_source not in ('BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK') or p_amount<=0 or p_amount>9007199254740991 or p_amount>coalesce((available->'sources'->>p_source)::numeric,0) then raise exception 'INSUFFICIENT_PAYABLE_AMOUNT';end if;
 insert into wallet_withdrawal_records(profile_id,source_code,amount,status,reference,masked_account,bank_name,request_key,bank_snapshot_encrypted,bank_account_hash,destination_bank_id,holder_snapshot_encrypted) values(p_profile,p_source,p_amount,'REQUESTED','RELOO-RUT-'||upper(replace(p_key::text,'-','')),bank.masked_account,bank.bank_name,p_key,bank.account_encrypted,bank.account_hash,p_bank,bank.holder_encrypted) returning id into new_id;
 insert into cashflow_payout_events(withdrawal_id,actor_id,status) values(new_id,p_profile,'REQUESTED');
 insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'PAYOUT_REQUESTED',jsonb_build_object('withdrawalId',new_id,'source',p_source,'amount',p_amount::text));return new_id;
end $$;
create or replace function reloo_review_payout(p_actor text,p_id uuid,p_action text,p_reason text,p_evidence uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare item wallet_withdrawal_records;next_status text;
begin
 if not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
 select * into item from wallet_withdrawal_records where id=p_id;if not found then raise exception 'REQUEST_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('payout:'||item.profile_id));
 select * into item from wallet_withdrawal_records where id=p_id for update;
 if length(trim(p_reason)) not between 20 and 2000 then raise exception 'REVIEW_REASON_REQUIRED';end if;
 if p_action='APPROVE' and item.status='REQUESTED' then next_status:='APPROVED';
 elsif p_action='PROCESS' and item.status='APPROVED' then next_status:='PROCESSING';
 elsif p_action='REJECT' and item.status in ('REQUESTED','APPROVED') then next_status:='REJECTED';
 elsif p_action='CONFIRM_PAID' and item.status='PROCESSING' and p_evidence is not null then next_status:='PAID';
 else raise exception 'INVALID_PAYOUT_TRANSITION';end if;
 if next_status in ('APPROVED','PROCESSING') then
  perform reloo_assert_active(item.profile_id);
  if not exists(select 1 from verified_identities where profile_id=item.profile_id and expires_at>now()) then raise exception 'VALID_IDENTITY_REQUIRED';end if;
  if item.amount>coalesce((reloo_payout_available(item.profile_id,p_id)->'sources'->>item.source_code)::numeric,0) then raise exception 'PAYOUT_FUNDING_CHANGED';end if;
 end if;
 update wallet_withdrawal_records set status=next_status,reason=p_reason,approved_by=case when next_status='APPROVED' then p_actor else approved_by end,reviewed_at=now(),updated_at=now(),paid_source_id=case when next_status='PAID' then p_evidence else paid_source_id end where id=p_id;
 insert into cashflow_payout_events(withdrawal_id,actor_id,status,reason) values(p_id,p_actor,next_status,p_reason);
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.profile_id,'PAYOUT_REVIEWED',jsonb_build_object('withdrawalId',p_id,'status',next_status,'reason',p_reason));
end $$;
create or replace function reloo_cancel_payout(p_profile text,p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare item wallet_withdrawal_records;
begin
 perform pg_advisory_xact_lock(hashtext('payout:'||p_profile));
 select * into item from wallet_withdrawal_records where id=p_id and profile_id=p_profile for update;if not found or item.status<>'REQUESTED' then raise exception 'CANNOT_CANCEL_REQUEST';end if;
 update wallet_withdrawal_records set status='CANCELLED',updated_at=now() where id=p_id;insert into cashflow_payout_events(withdrawal_id,actor_id,status) values(p_id,p_profile,'CANCELLED');
end $$;
create or replace function reloo_guard_payout_record() returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' or old.status in ('PAID','REJECTED','CANCELLED') or new.profile_id<>old.profile_id or new.source_code<>old.source_code or new.amount<>old.amount or new.request_key is distinct from old.request_key or new.bank_snapshot_encrypted is distinct from old.bank_snapshot_encrypted or new.destination_bank_id is distinct from old.destination_bank_id or new.bank_account_hash is distinct from old.bank_account_hash or new.holder_snapshot_encrypted is distinct from old.holder_snapshot_encrypted or new.reference is distinct from old.reference or new.masked_account is distinct from old.masked_account or new.bank_name is distinct from old.bank_name then raise exception 'PAYOUT_RECORD_IMMUTABLE';end if;return new;
end $$;
drop trigger if exists payout_record_guard on wallet_withdrawal_records;
create trigger payout_record_guard before update or delete on wallet_withdrawal_records for each row execute function reloo_guard_payout_record();
revoke all on function reloo_payout_available(text,uuid),reloo_release_payout(text,text,text,bigint,uuid,text),reloo_request_payout(text,text,bigint,uuid,uuid),reloo_review_payout(text,uuid,text,text,uuid),reloo_cancel_payout(text,uuid) from public,anon,authenticated;
grant execute on function reloo_payout_available(text,uuid),reloo_release_payout(text,text,text,bigint,uuid,text),reloo_request_payout(text,text,bigint,uuid,uuid),reloo_review_payout(text,uuid,text,text,uuid),reloo_cancel_payout(text,uuid) to service_role;
notify pgrst,'reload schema';
