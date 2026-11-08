create table if not exists promotion_funding_reclassifications (
 funding_id uuid primary key references promotion_funding(id),debit_account text not null default '3388' check(debit_account='3388'),credit_account text not null check(credit_account in ('411','5113')),amount bigint not null check(amount>0),created_at timestamptz not null default now()
);
alter table promotion_funding_reclassifications enable row level security;
revoke all on promotion_funding_reclassifications from anon,authenticated;
grant all on promotion_funding_reclassifications to service_role;
create or replace function reloo_post_promotion_funding() returns trigger language plpgsql security definer set search_path=public as $$begin insert into promotion_funding_reclassifications(funding_id,credit_account,amount) values(new.id,new.origin_account,new.amount);return new;end $$;
drop trigger if exists promo_funding_post on promotion_funding;
create trigger promo_funding_post after insert on promotion_funding for each row execute function reloo_post_promotion_funding();
insert into promotion_funding_reclassifications(funding_id,credit_account,amount) select id,origin_account,amount from promotion_funding on conflict do nothing;
drop trigger if exists promo_funding_reclass_immutable on promotion_funding_reclassifications;
create trigger promo_funding_reclass_immutable before update or delete on promotion_funding_reclassifications for each row execute function reloo_immutable_record();
create or replace function reloo_promotion_company_sources() returns jsonb language sql security definer set search_path=public as $$
select coalesce(jsonb_agg(row),'[]') from (select to_jsonb(s)||jsonb_build_object('amount',s.amount::text,'unallocated',(s.amount-coalesce((select sum(amount) from promotion_funding where source_id=s.id),0))::text) row from finance_sources s where s.direction='IN' and not exists(select 1 from customer_cash_entries where source_id=s.id) and not exists(select 1 from cashflow_payout_credits where funding_source_id=s.id) order by s.verified_at desc limit 200) q;
$$;
revoke all on function reloo_promotion_company_sources() from public,anon,authenticated;
grant execute on function reloo_promotion_company_sources() to service_role;
create or replace function reloo_fund_promotion_classified(p_actor text,p_campaign uuid,p_source uuid,p_amount bigint,p_reason text,p_origin text) returns uuid language plpgsql security definer set search_path=public as $$
declare source finance_sources;fund_id uuid;
begin
 if not reloo_staff_permission(p_actor,'promotions.write') or not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if p_origin not in ('411','5113') then raise exception 'ORIGIN_ACCOUNT_REQUIRED';end if;
 perform 1 from promotion_campaigns where id=p_campaign and funder='RELOO' for update;if not found then raise exception 'SPONSOR_PROGRAM_REQUIRED';end if;
 select * into source from finance_sources where id=p_source for update;
 if not found or source.direction<>'IN' or p_amount<=0 or length(trim(p_reason))<20 or exists(select 1 from customer_cash_entries where source_id=p_source) or exists(select 1 from cashflow_payout_credits where funding_source_id=p_source) then raise exception 'COMPANY_FUNDS_REQUIRED';end if;
 if p_amount+coalesce((select sum(amount) from promotion_funding where source_id=p_source),0)>source.amount then raise exception 'FUNDING_ALREADY_ALLOCATED';end if;
 insert into promotion_funding(campaign_id,source_id,amount,reason,origin_account,created_by) values(p_campaign,p_source,p_amount,p_reason,p_origin,p_actor) returning id into fund_id;
 perform reloo_assert_promotion_bank(source.bank_account_id);
 insert into security_audit(actor_id,action,details) values(p_actor,'PROMOTION_FUNDED',jsonb_build_object('campaignId',p_campaign,'sourceId',p_source,'amount',p_amount::text,'originAccount',p_origin,'reason',p_reason));return fund_id;
end $$;
revoke all on function reloo_fund_promotion_classified(text,uuid,uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function reloo_fund_promotion_classified(text,uuid,uuid,bigint,text,text) to service_role;
create or replace function reloo_promotion_bank_requirement(p_bank text) returns text language sql volatile security definer set search_path=public as $$ select reloo_promotion_bank_required(p_bank)::text $$;
revoke all on function reloo_promotion_bank_requirement(text) from public,anon,authenticated;
grant execute on function reloo_promotion_bank_requirement(text) to service_role;
notify pgrst,'reload schema';
