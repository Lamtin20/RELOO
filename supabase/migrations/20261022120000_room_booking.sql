-- Backend-only booking foundation. Not enabled for commercial transactions.
begin;
create table public.stay_properties (
 id uuid primary key, owner_id uuid not null, name text not null, city text not null,
 address text not null, latitude numeric, longitude numeric,
 status text not null default 'DRAFT' check(status in ('DRAFT','PENDING','APPROVED','SUSPENDED')),
 demo boolean not null default true
);
create table public.stay_memberships(property_id uuid references public.stay_properties(id),actor_id uuid not null,primary key(property_id,actor_id));
create table public.stay_room_types (
 id uuid primary key, property_id uuid not null references public.stay_properties(id), name text not null,
 capacity integer not null check(capacity between 1 and 20), nightly_price bigint not null check(nightly_price>0),
 version integer not null default 1, cleaning_minutes integer not null default 60 check(cleaning_minutes between 0 and 1440),
 amenities jsonb not null default '[]', policy jsonb not null,
 enabled boolean not null default false
);
create table public.stay_units(id uuid primary key,room_type_id uuid not null references public.stay_room_types(id),name text not null,enabled boolean not null default true);
create table public.stay_blocks(id uuid primary key default gen_random_uuid(),unit_id uuid not null references public.stay_units(id),starts_at timestamptz not null,ends_at timestamptz not null,reason text not null,check(ends_at>starts_at));
create table public.stay_quotes (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,room_type_id uuid not null references public.stay_room_types(id),
 starts_at timestamptz not null,ends_at timestamptz not null,guests integer not null,version integer not null,
 total bigint not null,snapshot jsonb not null,expires_at timestamptz not null
);
create table public.stay_orders (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,unit_id uuid not null references public.stay_units(id),
 quote_id uuid not null unique references public.stay_quotes(id),idempotency_key text not null,
 starts_at timestamptz not null,ends_at timestamptz not null,blocked_until timestamptz not null,
 hold_until timestamptz not null,total bigint not null,snapshot jsonb not null,
 status text not null check(status in ('HELD','CONFIRMED','CHECKED_IN','COMPLETED','EXPIRED','CANCELLED','NO_SHOW')),
 payment_status text not null default 'UNPAID' check(payment_status in ('UNPAID','PAID','FAILED')),
 refund_status text not null default 'NONE' check(refund_status in ('NONE','REVIEW_REQUIRED','REFUNDED')),
 created_at timestamptz not null default now(),unique(actor_id,idempotency_key)
);
create index stay_orders_inventory on public.stay_orders(unit_id,starts_at,blocked_until) where status in ('HELD','CONFIRMED','CHECKED_IN');
create table public.stay_payment_events(event_id text primary key,order_id uuid not null references public.stay_orders(id),amount bigint not null,outcome text not null check(outcome in ('SUCCESS','FAILED')),created_at timestamptz not null default now());
create table public.stay_audit(id bigint generated always as identity primary key,order_id uuid references public.stay_orders(id),actor_id uuid not null,event text not null,reason text not null,created_at timestamptz not null default now());
create table public.stay_outbox(id text primary key,order_id uuid not null references public.stay_orders(id),event text not null,created_at timestamptz not null default now(),delivered_at timestamptz);
create function public.stay_audit_immutable() returns trigger language plpgsql as $$begin raise exception 'APPEND_ONLY'; end$$;
create trigger stay_audit_immutable before update or delete on public.stay_audit for each row execute function public.stay_audit_immutable();

-- p_actor and p_admin are supplied only by the trusted backend, never by browser input.
create function public.reloo_stay_command(p_actor uuid,p_admin boolean,p_op text,p_input jsonb)
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
  end_at=((p_input->>'checkOut')::date+time '11:00') at time zone 'Asia/Ho_Chi_Minh';
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

do $$declare t text;begin
 foreach t in array array['stay_properties','stay_memberships','stay_room_types','stay_units','stay_blocks','stay_quotes','stay_orders','stay_payment_events','stay_audit','stay_outbox'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public, anon, authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
 end loop;
end$$;
revoke all on function public.reloo_stay_command(uuid,boolean,text,jsonb) from public,anon,authenticated;
revoke all on function public.stay_audit_immutable() from public,anon,authenticated;
revoke all on sequence public.stay_audit_id_seq from public,anon,authenticated;
grant usage,select on sequence public.stay_audit_id_seq to service_role;
grant execute on function public.reloo_stay_command(uuid,boolean,text,jsonb) to service_role;
commit;
