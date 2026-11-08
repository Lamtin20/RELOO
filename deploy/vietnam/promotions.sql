alter table invoice_documents add column if not exists buyer_profile_id text references profiles(id);
create table if not exists promotion_campaigns (
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 3 and 150),description text not null default '',terms text not null check(length(trim(terms)) between 20 and 6000),
 services text[] not null check(cardinality(services)>0 and services<@array['RENTAL','RELOO_FEE','LISTING_BOOST','INSPECTION','DELIVERY']),funder text not null check(funder in ('RELOO','PROVIDER')),
 starts_at timestamptz not null,ends_at timestamptz not null check(ends_at>starts_at),status text not null default 'DRAFT' check(status in ('DRAFT','ACTIVE','PAUSED','ENDED')),budget_limit bigint check(budget_limit>0 and budget_limit<=9007199254740991),
 version integer not null default 1,created_by text not null references profiles(id),updated_by text not null references profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists promotion_coupons (
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references promotion_campaigns(id),code text not null unique check(code~'^[A-Z0-9][A-Z0-9_-]{2,39}$'),discount_type text not null check(discount_type in ('AMOUNT','PERCENT')),value bigint not null check(value>0 and value<=9007199254740991),max_discount bigint check(max_discount>0),minimum_amount bigint not null default 0 check(minimum_amount>=0),
 starts_at timestamptz not null,ends_at timestamptz not null check(ends_at>starts_at),total_limit integer not null check(total_limit between 1 and 10000000),customer_limit integer not null default 1 check(customer_limit between 1 and total_limit),customer_ids text[] not null default '{}',first_order_only boolean not null default false,public_code boolean not null default false,
 status text not null default 'DRAFT' check(status in ('DRAFT','ACTIVE','PAUSED','ENDED')),version integer not null default 1,created_by text not null references profiles(id),updated_by text not null references profiles(id),updated_at timestamptz not null default now(),check(discount_type<>'PERCENT' or value<=10000)
);
create table if not exists promotion_participants (
 campaign_id uuid not null references promotion_campaigns(id),profile_id text not null references profiles(id),status text not null default 'INVITED' check(status in ('INVITED','ACCEPTED','DECLINED')),accepted_version integer,accepted_at timestamptz,created_by text not null references profiles(id),primary key(campaign_id,profile_id)
);
create table if not exists promotion_funding (
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references promotion_campaigns(id),source_id uuid not null references finance_sources(id),amount bigint not null check(amount>0 and amount<=9007199254740991),reason text not null check(length(trim(reason)) between 20 and 2000),origin_account text not null default '411' check(origin_account in ('411','5113')),created_by text not null references profiles(id),created_at timestamptz not null default now()
);
create table if not exists promotion_redemptions (
 id uuid primary key,order_kind text not null check(order_kind in ('RENTAL','INVOICE')),order_id uuid not null unique,campaign_id uuid not null references promotion_campaigns(id),coupon_id uuid not null references promotion_coupons(id),profile_id text not null references profiles(id),provider_id text references profiles(id),service text not null,
 gross bigint not null check(gross>0),discount bigint not null check(discount>0 and discount<=gross),net bigint not null check(net=gross-discount),owner_amount bigint not null check(owner_amount>=0),funder text not null check(funder in ('RELOO','PROVIDER')),quote jsonb not null,receipt jsonb not null,status text not null default 'RESERVED' check(status in ('RESERVED','REDEEMED','RELEASED')),created_at timestamptz not null default now(),redeemed_at timestamptz
);
create table if not exists promotion_funding_reservations (
 redemption_id uuid not null references promotion_redemptions(id),funding_id uuid not null references promotion_funding(id),amount bigint not null check(amount>0),primary key(redemption_id,funding_id)
);
create table if not exists promotion_subsidy_credits (
 id uuid primary key default gen_random_uuid(),redemption_id uuid not null references promotion_redemptions(id),funding_id uuid not null references promotion_funding(id),profile_id text not null references profiles(id),amount bigint not null check(amount>0),debit_account text not null default '641' check(debit_account='641'),credit_account text not null default '3388' check(credit_account='3388'),created_at timestamptz not null default now(),unique(redemption_id,funding_id)
);
do $$declare t text;begin foreach t in array array['promotion_campaigns','promotion_coupons','promotion_participants','promotion_funding','promotion_redemptions','promotion_funding_reservations','promotion_subsidy_credits'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from anon,authenticated',t);execute format('grant all on %I to service_role',t);end loop;end $$;
do $$declare t text;begin foreach t in array array['promotion_funding','promotion_funding_reservations','promotion_subsidy_credits'] loop execute format('drop trigger if exists promo_immutable on %I',t);execute format('create trigger promo_immutable before update or delete on %I for each row execute function reloo_immutable_record()',t);end loop;end $$;
create index if not exists promo_usage_by_coupon on promotion_redemptions(coupon_id,profile_id,status);
create or replace function reloo_promotion_quote(p_profile text,p_provider text,p_service text,p_gross bigint,p_code text) returns jsonb language plpgsql security definer set search_path=public as $$
declare c promotion_coupons;campaign promotion_campaigns;discount numeric;used bigint;spent numeric;available numeric;quote jsonb;
begin
 if p_gross<=0 or p_gross>9007199254740991 then raise exception 'PRICE_REQUIRED';end if;
 select * into c from promotion_coupons where code=upper(trim(p_code));if not found then raise exception 'COUPON_NOT_ELIGIBLE';end if;
 select * into campaign from promotion_campaigns where id=c.campaign_id;
 if campaign.status<>'ACTIVE' or c.status<>'ACTIVE' or now()<greatest(c.starts_at,campaign.starts_at) or now()>=least(c.ends_at,campaign.ends_at) or not p_service=any(campaign.services) or p_gross<c.minimum_amount or (cardinality(c.customer_ids)>0 and not p_profile=any(c.customer_ids)) then raise exception 'COUPON_NOT_ELIGIBLE';end if;
 if not exists(select 1 from profiles where id=p_profile and deleted_at is null) then raise exception 'CUSTOMER_REQUIRED';end if;
 if p_service='RENTAL' and campaign.funder='PROVIDER' and not exists(select 1 from promotion_participants where campaign_id=campaign.id and profile_id=p_provider and status='ACCEPTED' and accepted_version=campaign.version) then raise exception 'PROVIDER_CONSENT_REQUIRED';end if;
 if c.first_order_only and (exists(select 1 from rental_payment_intents where payer_id=p_profile and status in ('PAID','FREE')) or exists(select 1 from invoice_documents where buyer_profile_id=p_profile and status='ISSUED') or exists(select 1 from promotion_redemptions r join promotion_coupons prior on prior.id=r.coupon_id where r.profile_id=p_profile and r.status='RESERVED' and prior.first_order_only)) then raise exception 'FIRST_ORDER_REQUIRED';end if;
 select count(*) into used from promotion_redemptions where coupon_id=c.id and status in ('RESERVED','REDEEMED');if used>=c.total_limit then raise exception 'COUPON_LIMIT_REACHED';end if;
 select count(*) into used from promotion_redemptions where coupon_id=c.id and profile_id=p_profile and status in ('RESERVED','REDEEMED');if used>=c.customer_limit then raise exception 'CUSTOMER_LIMIT_REACHED';end if;
 discount=least(p_gross,case when c.discount_type='AMOUNT' then c.value::numeric else floor(p_gross::numeric*c.value/10000) end,coalesce(c.max_discount,9007199254740991));
 if discount<1 then raise exception 'DISCOUNT_ZERO';end if;
 select coalesce(sum(r.discount),0) into spent from promotion_redemptions r where r.campaign_id=campaign.id and r.status in ('RESERVED','REDEEMED');if campaign.budget_limit is not null and spent+discount>campaign.budget_limit then raise exception 'PROGRAM_BUDGET_LIMIT';end if;
 if campaign.funder='RELOO' and p_provider is not null then
   select coalesce(sum(f.amount),0)-coalesce((select sum(r.amount) from promotion_funding_reservations r join promotion_redemptions d on d.id=r.redemption_id where d.campaign_id=campaign.id and d.status in ('RESERVED','REDEEMED')),0) into available from promotion_funding f where f.campaign_id=campaign.id;
   if available<discount then raise exception 'SPONSOR_FUNDS_REQUIRED';end if;
 end if;
 return jsonb_build_object('campaignId',campaign.id,'campaignVersion',campaign.version,'couponId',c.id,'couponVersion',c.version,'code',c.code,'programName',campaign.name,'service',p_service,'payerId',p_profile,'providerId',p_provider,'gross',p_gross::text,'discount',discount::bigint::text,'net',(p_gross-discount)::bigint::text,'ownerAmount',case when campaign.funder='RELOO' and p_provider is not null then p_gross::text else (p_gross-discount)::bigint::text end,'funder',campaign.funder);
end $$;
create or replace function reloo_reserve_promotion(p_id uuid,p_kind text,p_order uuid,p_profile text,p_provider text,p_service text,p_gross bigint,p_code text,p_receipt jsonb,p_bank text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare selected_campaign uuid;quote jsonb;fund promotion_funding;remaining bigint;free bigint;part bigint;
begin
 perform 1 from profiles where id=p_profile for update;
 select c.campaign_id into selected_campaign from promotion_coupons c where c.code=upper(trim(p_code));if selected_campaign is null then raise exception 'COUPON_NOT_ELIGIBLE';end if;
 perform 1 from promotion_campaigns where id=selected_campaign for update;
 perform 1 from promotion_coupons where code=upper(trim(p_code)) for update;
 quote:=reloo_promotion_quote(p_profile,p_provider,p_service,p_gross,p_code);
 if p_receipt->'privatePayload'->'payload' is distinct from quote or p_receipt->'envelope'->>'streamId'<>p_id::text or p_receipt->>'hash'!~'^[a-f0-9]{64}$' or length(p_receipt->>'signature')<>88 then raise exception 'QUOTE_CHANGED';end if;
 insert into promotion_redemptions(id,order_kind,order_id,campaign_id,coupon_id,profile_id,provider_id,service,gross,discount,net,owner_amount,funder,quote,receipt) values(p_id,p_kind,p_order,selected_campaign,(quote->>'couponId')::uuid,p_profile,p_provider,p_service,p_gross,(quote->>'discount')::bigint,(quote->>'net')::bigint,(quote->>'ownerAmount')::bigint,quote->>'funder',quote,p_receipt);
 if quote->>'funder'='RELOO' and p_provider is not null then
   remaining:=(quote->>'discount')::bigint;
   for fund in select f.* from promotion_funding f join finance_sources s on s.id=f.source_id where f.campaign_id=selected_campaign and (p_bank is null or s.bank_account_id=p_bank) order by f.created_at,f.id for update of f loop
    select fund.amount-coalesce(sum(r.amount) filter(where d.status in ('RESERVED','REDEEMED')),0) into free from promotion_funding_reservations r join promotion_redemptions d on d.id=r.redemption_id where r.funding_id=fund.id;
    part:=least(remaining,greatest(free,0));if part>0 then perform reloo_assert_promotion_bank((select bank_account_id from finance_sources where id=fund.source_id));insert into promotion_funding_reservations values(p_id,fund.id,part);remaining:=remaining-part;end if;exit when remaining=0;
   end loop;
   if remaining<>0 then raise exception 'SPONSOR_BANK_FUNDS_REQUIRED';end if;
 end if;
 insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_provider,'COUPON_RESERVED',jsonb_build_object('redemptionId',p_id,'orderId',p_order,'discount',quote->>'discount','funder',quote->>'funder'));return quote;
end $$;
create or replace function reloo_settle_promotion(p_order uuid) returns void language plpgsql security definer set search_path=public as $$
declare r promotion_redemptions;
begin
 select * into r from promotion_redemptions where order_id=p_order for update;if not found or r.status='REDEEMED' then return;end if;
 if r.status<>'RESERVED' then raise exception 'PROMOTION_NOT_RESERVED';end if;
 if r.funder='RELOO' and r.provider_id is not null then
  perform reloo_assert_promotion_bank(s.bank_account_id) from promotion_funding_reservations a join promotion_funding f on f.id=a.funding_id join finance_sources s on s.id=f.source_id where a.redemption_id=r.id;
  insert into promotion_subsidy_credits(redemption_id,funding_id,profile_id,amount) select r.id,funding_id,r.provider_id,amount from promotion_funding_reservations where redemption_id=r.id;
 end if;
 update promotion_redemptions set status='REDEEMED',redeemed_at=now() where id=r.id;
 insert into security_audit(subject_id,action,details) values(r.profile_id,'COUPON_REDEEMED',jsonb_build_object('redemptionId',r.id,'orderId',p_order,'discount',r.discount::text));
end $$;
create or replace function reloo_promotion_bank_required(p_bank text) returns numeric language sql volatile security definer set search_path=public as $$
with customer as(select e.profile_id,sum(case when e.direction='IN' then e.amount else -e.amount end)::numeric n from customer_cash_entries e join finance_sources s on s.id=e.source_id where s.bank_account_id=p_bank group by e.profile_id),subsidy as(select c.profile_id,sum(c.amount)::numeric n from promotion_subsidy_credits c join promotion_funding f on f.id=c.funding_id join finance_sources s on s.id=f.source_id where s.bank_account_id=p_bank group by c.profile_id),liabilities as(select coalesce(sum(greatest(coalesce(c.n,0)+coalesce(s.n,0),0)),0) n from customer c full join subsidy s using(profile_id)),budget as(select coalesce(sum(f.amount),0)-coalesce((select sum(c.amount) from promotion_subsidy_credits c join promotion_funding f on f.id=c.funding_id join finance_sources s on s.id=f.source_id where s.bank_account_id=p_bank),0) n from promotion_funding f join finance_sources s on s.id=f.source_id where s.bank_account_id=p_bank)
select liabilities.n+budget.n from liabilities,budget;
$$;
create or replace function reloo_assert_promotion_bank(p_bank text) returns void language plpgsql security definer set search_path=public as $$
declare actual numeric;
begin
 perform pg_advisory_xact_lock(hashtext('promotion-bank:'||p_bank));
 select coalesce(sum(case when direction='IN' then amount else -amount end),0) into actual from finance_sources where bank_account_id=p_bank;
 if actual<reloo_promotion_bank_required(p_bank) then raise exception 'SPONSOR_LIQUIDITY_CHANGED';end if;
end $$;
create or replace function reloo_fund_promotion(p_actor text,p_campaign uuid,p_source uuid,p_amount bigint,p_reason text) returns uuid language plpgsql security definer set search_path=public as $$
declare source finance_sources;fund_id uuid;
begin
 if not reloo_staff_permission(p_actor,'promotions.write') or not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
 perform 1 from promotion_campaigns where id=p_campaign and funder='RELOO' for update;if not found then raise exception 'SPONSOR_PROGRAM_REQUIRED';end if;
 select * into source from finance_sources where id=p_source for update;
 if not found or source.direction<>'IN' or p_amount<=0 or length(trim(p_reason))<20 or exists(select 1 from customer_cash_entries where source_id=p_source) or exists(select 1 from cashflow_payout_credits where funding_source_id=p_source) then raise exception 'COMPANY_FUNDS_REQUIRED';end if;
 if p_amount+coalesce((select sum(amount) from promotion_funding where source_id=p_source),0)>source.amount then raise exception 'FUNDING_ALREADY_ALLOCATED';end if;
 insert into promotion_funding(campaign_id,source_id,amount,reason,created_by) values(p_campaign,p_source,p_amount,p_reason,p_actor) returning id into fund_id;
 perform reloo_assert_promotion_bank(source.bank_account_id);
 insert into security_audit(actor_id,action,details) values(p_actor,'PROMOTION_FUNDED',jsonb_build_object('campaignId',p_campaign,'sourceId',p_source,'amount',p_amount::text,'reason',p_reason));return fund_id;
end $$;
create or replace function reloo_accept_promotion(p_profile text,p_campaign uuid,p_version integer,p_accept boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform reloo_assert_active(p_profile);perform 1 from promotion_campaigns where id=p_campaign and version=p_version and status='ACTIVE' and funder='PROVIDER' for update;if not found then raise exception 'PROGRAM_CHANGED';end if;
 update promotion_participants set status=case when p_accept then 'ACCEPTED' else 'DECLINED' end,accepted_version=case when p_accept then p_version else null end,accepted_at=now() where campaign_id=p_campaign and profile_id=p_profile;
 if not found then raise exception 'INVITATION_REQUIRED';end if;
 insert into security_audit(actor_id,action,details) values(p_profile,'PROMOTION_PARTICIPATION',jsonb_build_object('campaignId',p_campaign,'version',p_version,'accepted',p_accept));
end $$;
create or replace function reloo_guard_promo_redemption() returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['status','redeemed_at'])<>(to_jsonb(old)-array['status','redeemed_at']) or old.status<>'RESERVED' or new.status not in ('REDEEMED','RELEASED') then raise exception 'PROMOTION_RECORD_IMMUTABLE';end if;return new;
end $$;
drop trigger if exists promo_redemption_immutable on promotion_redemptions;
create trigger promo_redemption_immutable before update or delete on promotion_redemptions for each row execute function reloo_guard_promo_redemption();
revoke all on function reloo_promotion_quote(text,text,text,bigint,text),reloo_reserve_promotion(uuid,text,uuid,text,text,text,bigint,text,jsonb,text),reloo_settle_promotion(uuid),reloo_fund_promotion(text,uuid,uuid,bigint,text),reloo_accept_promotion(text,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function reloo_promotion_quote(text,text,text,bigint,text),reloo_reserve_promotion(uuid,text,uuid,text,text,text,bigint,text,jsonb,text),reloo_settle_promotion(uuid),reloo_fund_promotion(text,uuid,uuid,bigint,text),reloo_accept_promotion(text,uuid,integer,boolean) to service_role;
notify pgrst,'reload schema';
create or replace function reloo_save_campaign(p_actor text,p_id uuid,p_version integer,p_fields jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare old promotion_campaigns;result uuid:=coalesce(p_id,gen_random_uuid());
begin
 if not reloo_staff_permission(p_actor,'promotions.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if p_id is not null then
  select * into old from promotion_campaigns where id=p_id and version=p_version for update;if not found then raise exception 'VERSION_CONFLICT';end if;
  if old.funder<>p_fields->>'funder' and (exists(select 1 from promotion_redemptions where campaign_id=p_id) or exists(select 1 from promotion_funding where campaign_id=p_id)) then raise exception 'FUNDER_LOCKED';end if;
  update promotion_campaigns set name=p_fields->>'name',description=p_fields->>'description',terms=p_fields->>'terms',services=array(select jsonb_array_elements_text(p_fields->'services')),funder=p_fields->>'funder',starts_at=(p_fields->>'starts_at')::timestamptz,ends_at=(p_fields->>'ends_at')::timestamptz,status=p_fields->>'status',budget_limit=(p_fields->>'budget_limit')::bigint,version=version+1,updated_by=p_actor,updated_at=now() where id=p_id;
 else
  insert into promotion_campaigns(id,name,description,terms,services,funder,starts_at,ends_at,status,budget_limit,created_by,updated_by) values(result,p_fields->>'name',p_fields->>'description',p_fields->>'terms',array(select jsonb_array_elements_text(p_fields->'services')),p_fields->>'funder',(p_fields->>'starts_at')::timestamptz,(p_fields->>'ends_at')::timestamptz,p_fields->>'status',(p_fields->>'budget_limit')::bigint,p_actor,p_actor);
 end if;
 insert into security_audit(actor_id,action,details) values(p_actor,'PROMOTION_CAMPAIGN_SAVED',jsonb_build_object('id',result,'previousVersion',p_version,'fields',p_fields));return result;
end $$;
create or replace function reloo_save_coupon(p_actor text,p_id uuid,p_version integer,p_campaign_version integer,p_fields jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare campaign promotion_campaigns;result uuid:=coalesce(p_id,gen_random_uuid());
begin
 if not reloo_staff_permission(p_actor,'promotions.write') then raise exception 'PERMISSION_REQUIRED';end if;
 select * into campaign from promotion_campaigns where id=(p_fields->>'campaign_id')::uuid and version=p_campaign_version for update;if not found then raise exception 'VERSION_CONFLICT';end if;
 if (p_fields->>'starts_at')::timestamptz<campaign.starts_at or (p_fields->>'ends_at')::timestamptz>campaign.ends_at then raise exception 'COUPON_WINDOW_OUTSIDE_PROGRAM';end if;
 if p_id is not null then
  perform 1 from promotion_coupons where id=p_id and campaign_id=campaign.id and version=p_version for update;if not found then raise exception 'VERSION_CONFLICT';end if;
  update promotion_coupons set code=p_fields->>'code',discount_type=p_fields->>'discount_type',value=(p_fields->>'value')::bigint,max_discount=(p_fields->>'max_discount')::bigint,minimum_amount=(p_fields->>'minimum_amount')::bigint,starts_at=(p_fields->>'starts_at')::timestamptz,ends_at=(p_fields->>'ends_at')::timestamptz,total_limit=(p_fields->>'total_limit')::integer,customer_limit=(p_fields->>'customer_limit')::integer,customer_ids=array(select jsonb_array_elements_text(p_fields->'customer_ids')),first_order_only=(p_fields->>'first_order_only')::boolean,public_code=(p_fields->>'public_code')::boolean,status=p_fields->>'status',version=version+1,updated_by=p_actor,updated_at=now() where id=p_id;
 else
  insert into promotion_coupons(id,campaign_id,code,discount_type,value,max_discount,minimum_amount,starts_at,ends_at,total_limit,customer_limit,customer_ids,first_order_only,public_code,status,created_by,updated_by) values(result,campaign.id,p_fields->>'code',p_fields->>'discount_type',(p_fields->>'value')::bigint,(p_fields->>'max_discount')::bigint,(p_fields->>'minimum_amount')::bigint,(p_fields->>'starts_at')::timestamptz,(p_fields->>'ends_at')::timestamptz,(p_fields->>'total_limit')::integer,(p_fields->>'customer_limit')::integer,array(select jsonb_array_elements_text(p_fields->'customer_ids')),(p_fields->>'first_order_only')::boolean,(p_fields->>'public_code')::boolean,p_fields->>'status',p_actor,p_actor);
 end if;
 update promotion_campaigns set version=version+1,updated_by=p_actor,updated_at=now() where id=campaign.id;
 insert into security_audit(actor_id,action,details) values(p_actor,'PROMOTION_COUPON_SAVED',jsonb_build_object('id',result,'campaignId',campaign.id,'previousVersion',p_version,'fields',p_fields));return result;
end $$;
create or replace function reloo_invite_promotion(p_actor text,p_campaign uuid,p_profile text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not reloo_staff_permission(p_actor,'promotions.write') then raise exception 'PERMISSION_REQUIRED';end if;
 perform 1 from promotion_campaigns where id=p_campaign and funder='PROVIDER' for share;if not found then raise exception 'PROVIDER_PROGRAM_REQUIRED';end if;
 perform 1 from profiles where id=p_profile and deleted_at is null;if not found then raise exception 'PROVIDER_REQUIRED';end if;
 insert into promotion_participants(campaign_id,profile_id,created_by) values(p_campaign,p_profile,p_actor) on conflict(campaign_id,profile_id) do nothing;
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,p_profile,'PROMOTION_PROVIDER_INVITED',jsonb_build_object('campaignId',p_campaign));
end $$;
revoke all on function reloo_save_campaign(text,uuid,integer,jsonb),reloo_save_coupon(text,uuid,integer,integer,jsonb),reloo_invite_promotion(text,uuid,text) from public,anon,authenticated;
grant execute on function reloo_save_campaign(text,uuid,integer,jsonb),reloo_save_coupon(text,uuid,integer,integer,jsonb),reloo_invite_promotion(text,uuid,text) to service_role;
create or replace function reloo_promotion_stats() returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'coupons',(select count(*) from promotion_coupons where campaign_id=c.id),'reserved',(select count(*) from promotion_redemptions where campaign_id=c.id and status='RESERVED'),'redeemed',(select count(*) from promotion_redemptions where campaign_id=c.id and status='REDEEMED'),'discountReserved',coalesce((select sum(discount) from promotion_redemptions where campaign_id=c.id and status='RESERVED'),0)::text,'discountRedeemed',coalesce((select sum(discount) from promotion_redemptions where campaign_id=c.id and status='REDEEMED'),0)::text,'funded',coalesce((select sum(amount) from promotion_funding where campaign_id=c.id),0)::text,'fundingCommitted',coalesce((select sum(f.amount) from promotion_funding_reservations f join promotion_redemptions r on r.id=f.redemption_id where r.campaign_id=c.id and r.status in ('RESERVED','REDEEMED')),0)::text)),'[]') from promotion_campaigns c;
$$;
revoke all on function reloo_promotion_stats() from public,anon,authenticated;
grant execute on function reloo_promotion_stats() to service_role;
revoke all on function reloo_promotion_bank_required(text),reloo_assert_promotion_bank(text) from public,anon,authenticated;
grant execute on function reloo_promotion_bank_required(text),reloo_assert_promotion_bank(text) to service_role;
