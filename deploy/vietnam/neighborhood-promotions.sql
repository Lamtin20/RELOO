begin;
alter table nk_promotions add column if not exists title jsonb not null default '{}';
alter table nk_promotions add column if not exists terms jsonb not null default '{}';
create or replace function nk_promotion_quote(p_actor text,p_area uuid,p_promotion uuid,p_quote jsonb) returns jsonb language plpgsql stable set search_path=public as $$
declare promo nk_promotions;discount bigint;
begin
 if p_promotion is null then return p_quote;end if;
 select * into promo from nk_promotions where id=p_promotion and area_id=p_area and enabled and expires_at>now();
 if not found or p_actor is null or not exists(select 1 from nk_memberships where profile_id=p_actor and area_id=p_area and status not in ('REJECTED','REVOKED')) or (promo.verified_only and not nk_is_verified(p_actor,p_area)) or exists(select 1 from nk_promotion_claims where promotion_id=promo.id and profile_id=p_actor) then raise exception 'PROMOTION_INELIGIBLE';end if;
 -- Promotions can waive an actual configured RELOO fee only, never invent a
 -- cash subsidy or silently reduce the owner's rental price/deposit.
 discount:=least(promo.amount,(p_quote->>'fee')::bigint);
 if discount<=0 or promo.used+discount>promo.budget then raise exception 'PROMOTION_INELIGIBLE';end if;
 return p_quote||jsonb_build_object('promotion',promo.id,'promotionTerms',promo.terms,'discount',discount,'total',(p_quote->>'total')::bigint-discount);
end $$;
create or replace function nk_claim_promotion(p_actor text,p_order uuid,p_quote jsonb) returns void language plpgsql set search_path=public as $$
declare promo nk_promotions;
begin
 if p_quote->>'promotion' is null then return;end if;
 select * into promo from nk_promotions where id=(p_quote->>'promotion')::uuid for update;
 if not promo.enabled or promo.expires_at<=now() or promo.used+(p_quote->>'discount')::bigint>promo.budget then raise exception 'PROMOTION_INELIGIBLE';end if;
 insert into nk_promotion_claims(order_id,promotion_id,profile_id,amount) values(p_order,promo.id,p_actor,(p_quote->>'discount')::bigint);
 update nk_promotions set used=used+(p_quote->>'discount')::bigint where id=promo.id;
end $$;
revoke all on function nk_promotion_quote(text,uuid,uuid,jsonb),nk_claim_promotion(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function nk_promotion_quote(text,uuid,uuid,jsonb),nk_claim_promotion(text,uuid,jsonb) to service_role;
commit;
