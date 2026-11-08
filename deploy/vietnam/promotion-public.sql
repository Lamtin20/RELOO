create or replace function reloo_public_promotions() returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(row),'[]') from (
 select jsonb_build_object('id',c.id,'title',p.name,'description',p.description,'terms',p.terms,'code',c.code,'type',c.discount_type,'value',c.value::text,'cap',c.max_discount::text,'minimum',c.minimum_amount::text,'firstOrder',c.first_order_only,'services',p.services,'funder',p.funder) row
 from promotion_coupons c join promotion_campaigns p on p.id=c.campaign_id
 where c.public_code and cardinality(c.customer_ids)=0 and c.status='ACTIVE' and p.status='ACTIVE'
 and now()>=greatest(c.starts_at,p.starts_at) and now()<least(c.ends_at,p.ends_at)
 and (select count(*) from promotion_redemptions r where r.coupon_id=c.id and r.status in ('RESERVED','REDEEMED'))<c.total_limit
 and (p.budget_limit is null or coalesce((select sum(r.discount) from promotion_redemptions r where r.campaign_id=p.id and r.status in ('RESERVED','REDEEMED')),0)<p.budget_limit)
 and (not p.services=array['RENTAL']
  or p.funder='PROVIDER' and exists(select 1 from promotion_participants a where a.campaign_id=p.id and a.status='ACCEPTED' and a.accepted_version=p.version)
  or p.funder='RELOO' and coalesce((select sum(f.amount) from promotion_funding f where f.campaign_id=p.id),0)>coalesce((select sum(a.amount) from promotion_funding_reservations a join promotion_redemptions r on r.id=a.redemption_id where r.campaign_id=p.id and r.status in ('RESERVED','REDEEMED')),0))
 order by c.updated_at desc limit 8
) q;
$$;
revoke all on function reloo_public_promotions() from public,anon,authenticated;
grant execute on function reloo_public_promotions() to service_role;
