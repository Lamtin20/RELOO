alter table rental_payment_intents add column if not exists gross_amount bigint;
alter table rental_payment_intents add column if not exists discount_amount bigint not null default 0;
alter table rental_payment_intents add column if not exists owner_amount bigint;
alter table rental_payment_intents add column if not exists coupon_id uuid references promotion_coupons(id);
update rental_payment_intents set gross_amount=amount,owner_amount=amount where gross_amount is null;
alter table rental_payment_intents alter column gross_amount set not null;
alter table rental_payment_intents alter column owner_amount set not null;
alter table rental_payment_intents alter column va_link_id drop not null;
alter table rental_payment_intents drop constraint if exists rental_payment_intents_amount_check;
alter table rental_payment_intents add constraint rental_payment_intents_amount_check check(amount>=0 and amount<=9007199254740991);
alter table rental_payment_intents drop constraint if exists rental_payment_intents_status_check;
alter table rental_payment_intents add constraint rental_payment_intents_status_check check(status in ('PENDING','PAID','REVIEW','FREE'));
create or replace function reloo_create_promoted_rental(p_profile text,p_agreement uuid,p_va uuid,p_code text,p_id uuid,p_receipt jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare rental rental_agreements;va customer_va_links;prior rental_payment_intents;quote jsonb;expiry timestamptz;coupon promotion_coupons;campaign promotion_campaigns;
begin
 perform reloo_assert_active(p_profile);
 select * into rental from rental_agreements where id=p_agreement for update;
 if not found or rental.renter_id<>p_profile or rental.status not in ('ACCEPTED','ACTIVE') or not exists(select 1 from brand_settings where id=true and rental_payments_enabled) then raise exception 'PAYMENT_NOT_ENABLED';end if;
 perform reloo_assert_active(rental.lender_id);
 if not exists(select 1 from verified_identities where profile_id=p_profile and expires_at>now()) then raise exception 'VALID_IDENTITY_REQUIRED';end if;
 select * into prior from rental_payment_intents where agreement_id=p_agreement and kind='RENTAL';
 if found then
  if prior.coupon_id is not null and not exists(select 1 from promotion_redemptions r where r.order_id=prior.id and r.quote->>'code'=upper(trim(p_code))) or prior.coupon_id is null and coalesce(p_code,'')<>'' then raise exception 'EXISTING_PAYMENT_PRICE_LOCKED';end if;
  return prior.id;
 end if;
 if coalesce(p_code,'')<>'' then quote:=reloo_promotion_quote(p_profile,rental.lender_id,'RENTAL',rental.rent_amount,p_code);
 else quote:=jsonb_build_object('gross',rental.rent_amount::text,'discount','0','net',rental.rent_amount::text,'ownerAmount',rental.rent_amount::text);end if;
 if (quote->>'net')::bigint>0 then
  select * into va from customer_va_links where id=p_va and profile_id=p_profile and status='ACTIVE' and (expires_at is null or expires_at>now()) for share;if not found then raise exception 'OWN_ACTIVE_VA_REQUIRED';end if;
 end if;
 if coalesce(p_code,'')<>'' then quote:=reloo_reserve_promotion(p_id,'RENTAL',p_id,p_profile,rental.lender_id,'RENTAL',rental.rent_amount,p_code,p_receipt,va.bank_account_id);end if;
 expiry=least(now()+interval '1 day',coalesce(va.expires_at,now()+interval '1 day'));
 if quote ? 'couponId' then select * into coupon from promotion_coupons where id=(quote->>'couponId')::uuid;select * into campaign from promotion_campaigns where id=coupon.campaign_id;expiry=least(expiry,coupon.ends_at,campaign.ends_at);end if;
 insert into rental_payment_intents(id,agreement_id,payer_id,beneficiary_id,va_link_id,kind,amount,gross_amount,discount_amount,owner_amount,coupon_id,reference,expires_at,status)
 values(p_id,p_agreement,p_profile,rental.lender_id,case when (quote->>'net')::bigint>0 then p_va else null end,'RENTAL',(quote->>'net')::bigint,(quote->>'gross')::bigint,(quote->>'discount')::bigint,(quote->>'ownerAmount')::bigint,(quote->>'couponId')::uuid,'RELOO'||upper(replace(p_id::text,'-','')),expiry,case when (quote->>'net')::bigint=0 then 'FREE' else 'PENDING' end);
 if (quote->>'net')::bigint=0 then perform reloo_settle_promotion(p_id);end if;
 return p_id;
end $$;
-- Keep existing callers working; new calls use the same price guard for discounted and normal orders.
create or replace function reloo_create_payment_intent(p_profile text,p_agreement uuid,p_va uuid) returns uuid language sql security definer set search_path=public as $$select reloo_create_promoted_rental(p_profile,p_agreement,p_va,'',gen_random_uuid(),null)$$;
do $$begin if to_regprocedure('public.reloo_allocate_rental_payment_before_promotion(uuid,text,text)') is null then alter function reloo_allocate_rental_payment(uuid,text,text) rename to reloo_allocate_rental_payment_before_promotion;end if;end $$;
create or replace function reloo_allocate_rental_payment(p_source uuid,p_payer text,p_reference text) returns boolean language plpgsql security definer set search_path=public as $$
declare applied boolean;order_id uuid;
begin
 applied:=reloo_allocate_rental_payment_before_promotion(p_source,p_payer,p_reference);
 if applied then select id into order_id from rental_payment_intents where paid_source_id=p_source;perform reloo_settle_promotion(order_id);end if;return applied;
end $$;
create or replace function reloo_guard_promotion_intent() returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['status','paid_source_id'])<>(to_jsonb(old)-array['status','paid_source_id']) or old.status in ('PAID','FREE') then raise exception 'PAYMENT_PRICE_IMMUTABLE';end if;return new;
end $$;
drop trigger if exists promoted_price_immutable on rental_payment_intents;
create trigger promoted_price_immutable before update or delete on rental_payment_intents for each row execute function reloo_guard_promotion_intent();
revoke all on function reloo_create_promoted_rental(text,uuid,uuid,text,uuid,jsonb),reloo_allocate_rental_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function reloo_create_promoted_rental(text,uuid,uuid,text,uuid,jsonb),reloo_allocate_rental_payment(uuid,text,text) to service_role;
notify pgrst,'reload schema';
