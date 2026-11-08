create table if not exists public.wallet_category_events (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references customer_cash_entries(id),profile_id text not null references profiles(id),
 source_code text not null check(source_code in ('BANK','RENTAL','DEPOSIT','REFUND')),reason text not null check(length(trim(reason))>=20),created_by text not null references profiles(id),created_at timestamptz not null default clock_timestamp(),event_sequence bigint generated always as identity unique
);
create index if not exists wallet_category_latest on public.wallet_category_events(entry_id,event_sequence desc);
create table if not exists public.wallet_withdrawal_records (
 id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),source_code text not null check(source_code in ('BANK','RENTAL','DEPOSIT','REFUND','SHOPEE','TIKTOK')),
 amount bigint not null check(amount>0 and amount<=9007199254740991),status text not null check(status in ('REQUESTED','APPROVED','PROCESSING','PAID','REJECTED','CANCELLED')),
 reference text not null unique,masked_account text not null,bank_name text not null,reason text,paid_source_id uuid unique references finance_sources(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(status<>'PAID' or paid_source_id is not null)
);
do $$ declare t text;begin foreach t in array array['wallet_category_events','wallet_withdrawal_records'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
drop trigger if exists wallet_category_immutable on public.wallet_category_events;
create trigger wallet_category_immutable before update or delete on public.wallet_category_events for each row execute function public.reloo_immutable_record();
create or replace function public.reloo_classify_wallet_entry(p_actor text,p_entry uuid,p_source text,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare item customer_cash_entries;
begin
 if not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
 select * into item from customer_cash_entries where id=p_entry for update;if not found then raise exception 'VERIFIED_ENTRY_REQUIRED';end if;
 if p_source not in ('BANK','RENTAL','DEPOSIT','REFUND') or length(trim(p_reason))<20 then raise exception 'CLASSIFICATION_REQUIRED';end if;
 if p_source='DEPOSIT' and not exists(select 1 from business_settings where id=true and deposit->>'enabled'='true') then raise exception 'DEPOSIT_NOT_ENABLED';end if;
 insert into wallet_category_events(entry_id,profile_id,source_code,reason,created_by) values(item.id,item.profile_id,p_source,p_reason,p_actor);
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.profile_id,'WALLET_SOURCE_CLASSIFIED',jsonb_build_object('entryId',p_entry,'source',p_source,'reason',p_reason));
end $$;
create or replace function public.reloo_check_withdrawal_evidence() returns trigger language plpgsql as $$
begin
 if new.status='PAID' and not exists(select 1 from customer_cash_entries e join finance_sources s on s.id=e.source_id where e.profile_id=new.profile_id and s.id=new.paid_source_id and s.direction='OUT' and s.amount=new.amount) then raise exception 'PAID_WITHDRAWAL_EVIDENCE_REQUIRED';end if;
 return new;
end $$;
drop trigger if exists wallet_withdrawal_evidence on public.wallet_withdrawal_records;
create trigger wallet_withdrawal_evidence before insert or update on public.wallet_withdrawal_records for each row execute function public.reloo_check_withdrawal_evidence();
create or replace function public.reloo_wallet_snapshot(p_profile text) returns jsonb language sql security definer set search_path=public as $$
with owned_conversions as (
 select c.*,a.merchant as click_merchant from cashback_conversions c join affiliate_clicks a on a.id=c.click_id where a.profile_id=p_profile
)
select jsonb_build_object(
 'bankCount',(select count(*) from customer_cash_entries where profile_id=p_profile),
 'bankEntries',coalesce((select jsonb_agg(row) from (select jsonb_build_object('id',e.id,'direction',e.direction,'amount',e.amount::text,'reference',e.reference,'occurred_at',e.occurred_at,'sourceCode',coalesce((select c.source_code from wallet_category_events c where c.entry_id=e.id and c.profile_id=p_profile order by c.event_sequence desc limit 1),'BANK'),'evidence',jsonb_set(to_jsonb(s),'{amount}',to_jsonb(s.amount::text))) row from customer_cash_entries e join finance_sources s on s.id=e.source_id where e.profile_id=p_profile order by e.occurred_at desc,e.id limit 10000) q),'[]'),
 'conversionsCount',(select count(*) from owned_conversions),
 'conversions',coalesce((select jsonb_agg(row) from (select jsonb_build_object('id',id,'orderId',provider_order_id,'merchant',click_merchant,'status',status,'reward',reward::text,'updatedAt',provider_updated_at,'createdAt',created_at) row from owned_conversions order by provider_updated_at desc limit 10000) q),'[]'),
 'cashbackLedger',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'conversionId',l.conversion_id,'amount',l.amount::text,'event',l.event_type,'createdAt',l.created_at)) from cashback_ledger l join owned_conversions c on c.id=l.conversion_id where l.profile_id=p_profile),'[]'),
 'withdrawalsCount',(select count(*) from wallet_withdrawal_records where profile_id=p_profile),
 'withdrawals',coalesce((select jsonb_agg(row) from (select jsonb_build_object('id',id,'sourceCode',source_code,'amount',amount::text,'status',status,'reference',reference,'maskedAccount',masked_account,'bankName',bank_name,'reason',reason,'createdAt',created_at,'updatedAt',updated_at) row from wallet_withdrawal_records where profile_id=p_profile order by created_at desc,id limit 10000) q),'[]'),
 'deposit',coalesce((select deposit from business_settings where id=true),'{"enabled":false}')
);
$$;
revoke all on function public.reloo_wallet_snapshot(text),public.reloo_classify_wallet_entry(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reloo_wallet_snapshot(text),public.reloo_classify_wallet_entry(text,uuid,text,text) to service_role;
notify pgrst,'reload schema';
