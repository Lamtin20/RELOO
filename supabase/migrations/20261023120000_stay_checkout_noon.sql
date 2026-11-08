-- New quotes only; existing quote/order timestamps and policy snapshots remain immutable.
create or replace function public.reloo_stay_command(p_actor uuid,p_admin boolean,p_op text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r stay_room_types; q stay_quotes; o stay_orders; u uuid; start_at timestamptz; end_at timestamptz;
 n integer; people integer; payload jsonb; key text; allowed boolean; ev text; target text;
begin
 if p_actor is null then raise exception 'AUTH_REQUIRED'; end if;
 -- Reclaim holds and publish unique expiry events atomically with each command.
 for o in update stay_orders set status='EXPIRED' where status='HELD' and hold_until<=now() returning * loop
  insert into stay_audit(order_id,actor_id,event,reason) values(o.id,p_actor,'EXPIRED','hold_timeout');
  insert into stay_outbox values(o.id||':EXPIRED',o.id,'EXPIRED',now(),null) on conflict do nothing;
 end loop;
 if p_op='quote' then
  select * into r from stay_room_types where id=(p_input->>'roomTypeId')::uuid and enabled;
  if not found or not exists(select 1 from stay_properties where id=r.property_id and status='APPROVED' and demo) then raise exception 'UNAVAILABLE'; end if;
  if coalesce(p_input->>'checkIn','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_input->>'checkOut','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_DATES'; end if;
  n=(p_input->>'checkOut')::date-(p_input->>'checkIn')::date;
  people=(p_input->>'guests')::integer;
  start_at=((p_input->>'checkIn')::date+time '14:00') at time zone 'Asia/Ho_Chi_Minh';
  end_at=((p_input->>'checkOut')::date+time '12:00') at time zone 'Asia/Ho_Chi_Minh';
  if n<1 or n>30 or start_at<=now() or people is null or people<1 or people>r.capacity then raise exception 'INVALID_DATES_OR_GUESTS'; end if;
  if not exists(select 1 from stay_units su where su.room_type_id=r.id and su.enabled and not exists(select 1 from stay_orders so where so.unit_id=su.id and so.status in ('HELD','CONFIRMED','CHECKED_IN') and so.starts_at<end_at+make_interval(mins=>r.cleaning_minutes) and so.blocked_until>start_at) and not exists(select 1 from stay_blocks b where b.unit_id=su.id and b.starts_at<end_at+make_interval(mins=>r.cleaning_minutes) and b.ends_at>start_at)) then raise exception 'SOLD_OUT'; end if;
  insert into stay_quotes(actor_id,room_type_id,starts_at,ends_at,guests,version,total,snapshot,expires_at)
  values(p_actor,r.id,start_at,end_at,people,r.version,n*r.nightly_price,
   jsonb_build_object('demo',true,'roomName',r.name,'nights',n,'nightlyPrice',r.nightly_price,'roomTotal',n*r.nightly_price,'fees',0,'tax',0,'discount',0,'total',n*r.nightly_price,'currency','VND','timezone','Asia/Ho_Chi_Minh','policy',r.policy,'version',r.version),now()+interval '5 minutes') returning * into q;
  return to_jsonb(q);
 elsif p_op='hold' then
  key=p_input->>'key'; if key is null or length(key)<8 or length(key)>100 then raise exception 'INVALID_KEY'; end if;
  -- Serialize retries by actor/key, including retries that use a different quote.
  perform pg_advisory_xact_lock(hashtext(p_actor::text||key));
  select * into o from stay_orders where actor_id=p_actor and idempotency_key=key;
  if found then
   if o.quote_id<>(p_input->>'quoteId')::uuid then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return to_jsonb(o);
  end if;
  select * into q from stay_quotes where id=(p_input->>'quoteId')::uuid and actor_id=p_actor;
  if not found then raise exception 'NOT_FOUND'; end if;
  if q.expires_at<=now() or q.starts_at<=now() then raise exception 'QUOTE_EXPIRED'; end if;
  if p_input->>'policyId' is distinct from q.snapshot->'policy'->>'id' then raise exception 'POLICY_CHANGED'; end if;
  select * into r from stay_room_types where id=q.room_type_id for update;
  if r.version<>q.version then raise exception 'PRICE_CHANGED'; end if;
  if not r.enabled or not exists(select 1 from stay_properties where id=r.property_id and status='APPROVED' and demo) then raise exception 'UNAVAILABLE'; end if;
  select su.id into u from stay_units su where su.room_type_id=r.id and su.enabled
   and not exists(select 1 from stay_orders so where so.unit_id=su.id and so.status in ('HELD','CONFIRMED','CHECKED_IN') and so.starts_at<q.ends_at+make_interval(mins=>r.cleaning_minutes) and so.blocked_until>q.starts_at)
   and not exists(select 1 from stay_blocks b where b.unit_id=su.id and b.starts_at<q.ends_at+make_interval(mins=>r.cleaning_minutes) and b.ends_at>q.starts_at) order by su.id limit 1;
  if u is null then raise exception 'SOLD_OUT'; end if;
  insert into stay_orders(actor_id,unit_id,quote_id,idempotency_key,starts_at,ends_at,blocked_until,hold_until,total,snapshot,status)
   values(p_actor,u,q.id,key,q.starts_at,q.ends_at,q.ends_at+make_interval(mins=>r.cleaning_minutes),now()+interval '10 minutes',q.total,q.snapshot,'HELD') returning * into o;
  insert into stay_audit(order_id,actor_id,event,reason) values(o.id,p_actor,'HELD','demo_hold');
  return to_jsonb(o);
 elsif p_op='mine' then
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from stay_orders s where actor_id=p_actor),'[]');
 elsif p_op='manage' then
  return coalesce((select jsonb_agg(to_jsonb(s)) from stay_orders s join stay_units su on su.id=s.unit_id join stay_room_types rt on rt.id=su.room_type_id where p_admin or exists(select 1 from stay_memberships m where m.property_id=rt.property_id and m.actor_id=p_actor)),'[]');
 end if;
 select * into o from stay_orders where id=(p_input->>'orderId')::uuid for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 allowed=p_admin or exists(select 1 from stay_units su join stay_room_types rt on rt.id=su.room_type_id join stay_memberships m on m.property_id=rt.property_id where su.id=o.unit_id and m.actor_id=p_actor);
 if o.actor_id<>p_actor and not allowed then raise exception 'FORBIDDEN'; end if;
 if p_op='order' then
  return to_jsonb(o)||jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('event',event,'reason',reason,'at',created_at) order by id) from stay_audit where order_id=o.id),'[]'));
 elsif p_op='pay-test' then
  -- This command is intentionally a simulator; no provider is invoked.
  ev=p_input->>'eventId';
  if ev is null or length(ev)<8 or length(ev)>120 or (p_input->>'amount')::bigint is distinct from o.total then raise exception 'PAYMENT_INVALID'; end if;
  target=coalesce(p_input->>'outcome','SUCCESS');
  if target not in ('SUCCESS','FAILED') then raise exception 'PAYMENT_INVALID'; end if;
  if exists(select 1 from stay_payment_events where event_id=ev and (order_id<>o.id or outcome<>target)) then raise exception 'EVENT_CONFLICT'; end if;
  if exists(select 1 from stay_payment_events where event_id=ev) then return to_jsonb(o); end if;
  if o.payment_status='PAID' then raise exception 'ALREADY_PAID'; end if;
  insert into stay_payment_events(event_id,order_id,amount,outcome) values(ev,o.id,o.total,target);
  if target='FAILED' then
   update stay_orders set payment_status='FAILED' where id=o.id returning * into o;
  elsif o.status='HELD' and o.hold_until>now() then
   update stay_orders set status='CONFIRMED',payment_status='PAID' where id=o.id returning * into o;
  else
   update stay_orders set payment_status='PAID',refund_status='REVIEW_REQUIRED' where id=o.id returning * into o;
  end if;
  insert into stay_audit(order_id,actor_id,event,reason) values(o.id,p_actor,o.status,'demo_payment');
 elsif p_op in ('cancel-preview','cancel') then
  if o.status not in ('HELD','CONFIRMED') or o.starts_at<=now() then raise exception 'CANCEL_UNAVAILABLE'; end if;
  if o.snapshot->'policy'->>'id'<>'DEMO_FLEX' then raise exception 'POLICY_UNAVAILABLE'; end if;
  if p_op='cancel-preview' then return jsonb_build_object('orderId',o.id,'demo',true,'refund',case when o.payment_status='PAID' then o.total else 0 end,'deadline',o.starts_at,'policyId','DEMO_FLEX'); end if;
  update stay_orders set status='CANCELLED',refund_status=case when payment_status='PAID' then 'REFUNDED' else 'NONE' end where id=o.id returning * into o;
  insert into stay_audit(order_id,actor_id,event,reason) values(o.id,p_actor,'CANCELLED','demo_policy_accepted');
 elsif p_op='transition' then
  if not allowed then raise exception 'FORBIDDEN'; end if;
  target=p_input->>'target';
  if not ((o.status='CONFIRMED' and target='CHECKED_IN' and now()>=o.starts_at and now()<o.ends_at) or (o.status='CHECKED_IN' and target='COMPLETED') or (o.status='CONFIRMED' and target='NO_SHOW' and now()>o.starts_at)) then raise exception 'INVALID_STATE'; end if;
  if length(coalesce(p_input->>'reason',''))<3 then raise exception 'REASON_REQUIRED'; end if;
  update stay_orders set status=target where id=o.id returning * into o;
  insert into stay_audit(order_id,actor_id,event,reason) values(o.id,p_actor,target,left(p_input->>'reason',500));
 else raise exception 'INVALID_OPERATION'; end if;
 insert into stay_outbox values(o.id||':'||o.status||':'||o.payment_status,o.id,o.status,now(),null) on conflict do nothing;
 return to_jsonb(o);
end$$;

revoke all on function public.reloo_stay_command(uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_stay_command(uuid,boolean,text,jsonb) to service_role;
