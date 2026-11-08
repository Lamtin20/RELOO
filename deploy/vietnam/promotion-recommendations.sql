alter table promotion_campaigns drop constraint if exists promotion_campaigns_services_check;
alter table promotion_campaigns add constraint promotion_campaigns_services_check check(cardinality(services)>0 and services<@array['RENTAL','SALE','RELOO_FEE','LISTING_BOOST','INSPECTION','DELIVERY']);
create or replace function reloo_promotion_quote(p_profile text,p_provider text,p_service text,p_gross bigint,p_code text) returns jsonb language plpgsql security definer set search_path=public as $$
declare c promotion_coupons;campaign promotion_campaigns;discount numeric;used bigint;spent numeric;available numeric;quote jsonb;
begin
 if p_gross<=0 or p_gross>9007199254740991 then raise exception 'PRICE_REQUIRED';end if;
 select * into c from promotion_coupons where code=upper(trim(p_code));if not found then raise exception 'COUPON_NOT_ELIGIBLE';end if;
 select * into campaign from promotion_campaigns where id=c.campaign_id;
 if campaign.status<>'ACTIVE' or c.status<>'ACTIVE' or now()<greatest(c.starts_at,campaign.starts_at) or now()>=least(c.ends_at,campaign.ends_at) or not p_service=any(campaign.services) or p_gross<c.minimum_amount or (cardinality(c.customer_ids)>0 and not p_profile=any(c.customer_ids)) then raise exception 'COUPON_NOT_ELIGIBLE';end if;
 if not exists(select 1 from profiles where id=p_profile and deleted_at is null) then raise exception 'CUSTOMER_REQUIRED';end if;
 if p_service in ('RENTAL','SALE') and campaign.funder='PROVIDER' and not exists(select 1 from promotion_participants where campaign_id=campaign.id and profile_id=p_provider and status='ACCEPTED' and accepted_version=campaign.version) then raise exception 'PROVIDER_CONSENT_REQUIRED';end if;
 if c.first_order_only and (exists(select 1 from purchase_orders where buyer_id=p_profile and status='COMPLETED') or exists(select 1 from rental_payment_intents where payer_id=p_profile and status in ('PAID','FREE')) or exists(select 1 from invoice_documents where buyer_profile_id=p_profile and status='ISSUED') or exists(select 1 from promotion_redemptions r join promotion_coupons prior on prior.id=r.coupon_id where r.profile_id=p_profile and r.status='RESERVED' and prior.first_order_only)) then raise exception 'FIRST_ORDER_REQUIRED';end if;
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
create or replace function reloo_recommend_promotions(p_profile text,p_provider text,p_service text,p_gross bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare c record;q jsonb;result jsonb:='[]';
begin
 if p_service not in ('RENTAL','SALE') or p_gross<=0 then raise exception 'PRICE_REQUIRED';end if;
 if not exists(select 1 from profiles where id=p_profile and deleted_at is null) then raise exception 'CUSTOMER_REQUIRED';end if;
 for c in select coupon.code,campaign.terms,coupon.ends_at from promotion_coupons coupon join promotion_campaigns campaign on campaign.id=coupon.campaign_id where coupon.status='ACTIVE' and campaign.status='ACTIVE' and (coupon.public_code or p_profile=any(coupon.customer_ids)) and (cardinality(coupon.customer_ids)=0 or p_profile=any(coupon.customer_ids)) and p_service=any(campaign.services) order by coupon.ends_at,coupon.id limit 100 loop
  begin
   q:=reloo_promotion_quote(p_profile,p_provider,p_service,p_gross,c.code);
   if q->>'funder'='RELOO' and p_provider is not null then
    perform reloo_assert_promotion_bank(s.bank_account_id) from promotion_funding f join finance_sources s on s.id=f.source_id where f.campaign_id=(q->>'campaignId')::uuid;
   end if;
   result:=result||jsonb_build_array(q||jsonb_build_object('terms',c.terms,'endsAt',c.ends_at));
  exception when others then
   if sqlerrm not in ('COUPON_NOT_ELIGIBLE','PROVIDER_CONSENT_REQUIRED','FIRST_ORDER_REQUIRED','COUPON_LIMIT_REACHED','CUSTOMER_LIMIT_REACHED','PROGRAM_BUDGET_LIMIT','SPONSOR_FUNDS_REQUIRED','SPONSOR_LIQUIDITY_CHANGED','DISCOUNT_ZERO') then raise;end if;
  end;
 end loop;
 return coalesce((select jsonb_agg(value) from (select value from jsonb_array_elements(result) order by (value->>'discount')::bigint desc,value->>'code' limit 3) ranked),'[]');
end$$;
revoke all on function reloo_recommend_promotions(text,text,text,bigint) from public,anon,authenticated;
grant execute on function reloo_recommend_promotions(text,text,text,bigint) to service_role;
notify pgrst,'reload schema';
