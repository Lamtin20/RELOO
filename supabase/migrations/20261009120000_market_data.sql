create table if not exists public.price_sources(
 id text primary key,name text not null,enabled boolean not null default false,access_basis text,
 status text not null default 'NOT_CONNECTED',last_success_at timestamptz,last_error_code text,
 check(not enabled or (access_basis is not null and length(trim(access_basis))>=10))
);
insert into public.price_sources(id,name) values ('chotot','Chợ Tốt'),('tgdd','Thế Giới Di Động'),('fpt','FPT Shop'),('dmx','Điện Máy Xanh'),('cellphones','CellphoneS') on conflict(id) do nothing;
create table if not exists public.price_targets(
 id uuid primary key default gen_random_uuid(),source_id text not null references price_sources(id),url text not null,
 brand text not null,model text not null,variant text not null default '',model_key text not null,category text not null,
 price_kind text not null check(price_kind in ('new_retail','used_asking','buyback','rental_daily')),
 condition text not null default 'unknown' check(condition in ('new','like_new','good','fair','unknown')),
 enabled boolean not null default true,permission_note text not null,
 interval_minutes integer not null default 360 check(interval_minutes between 60 and 10080),
 next_run_at timestamptz not null default now(),lease_until timestamptz,last_status text,last_checked_at timestamptz,
 created_at timestamptz not null default now(),unique(source_id,url)
);
create table if not exists public.price_snapshots(
 id uuid primary key default gen_random_uuid(),target_id uuid references price_targets(id),source_id text not null references price_sources(id),
 model_key text not null,category text not null,title text not null,description text not null default '',url text not null,
 price bigint not null check(price between 1000 and 1000000000),price_kind text not null check(price_kind in ('new_retail','used_asking','buyback','rental_daily')),
 condition text not null check(condition in ('new','like_new','good','fair','unknown')),in_stock boolean not null,
 verified boolean not null default false,observed_at timestamptz not null default now(),content_hash text,extractor_version text not null,
 unique(target_id,observed_at)
);
create index if not exists price_snapshots_model_time on public.price_snapshots(model_key,observed_at desc);
create table if not exists public.price_collection_runs(
 id uuid primary key default gen_random_uuid(),target_id uuid references price_targets(id),source_id text not null references price_sources(id),
 status text not null,reason_code text,observed_at timestamptz not null default now(),snapshot_id uuid references price_snapshots(id)
);
alter table public.affiliate_products add column if not exists category text not null default 'Khác';
alter table public.affiliate_products add column if not exists commission_bps integer check(commission_bps between 0 and 10000);
alter table public.affiliate_products add column if not exists in_stock boolean not null default false;
alter table public.affiliate_products add column if not exists expires_at timestamptz;
alter table public.affiliate_products add column if not exists source_reference text;
alter table public.affiliate_products drop constraint if exists affiliate_products_feed_expiry;
alter table public.affiliate_products add constraint affiliate_products_feed_expiry check(expires_at is null or (expires_at>source_updated_at and expires_at<=source_updated_at+interval '7 days'));
create index if not exists affiliate_products_current on public.affiliate_products(merchant,expires_at);
alter table public.price_sources enable row level security;
alter table public.price_targets enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.price_collection_runs enable row level security;
alter table public.affiliate_products enable row level security;
revoke all on public.price_sources,public.price_targets,public.price_snapshots,public.price_collection_runs,public.affiliate_products from anon,authenticated;
grant select,insert,update,delete on public.price_sources,public.price_targets,public.affiliate_products to service_role;
grant select,insert on public.price_snapshots,public.price_collection_runs to service_role;
create or replace function public.reloo_claim_price_target() returns setof public.price_targets language plpgsql security definer set search_path=public as $$
declare target public.price_targets;
begin
 select t.* into target from price_targets t join price_sources s on s.id=t.source_id
 where t.enabled and s.enabled and t.next_run_at<=now() and (t.lease_until is null or t.lease_until<now())
 order by t.next_run_at for update of t skip locked limit 1;
 if not found then return; end if;
 update price_targets set lease_until=now()+interval '10 minutes' where id=target.id;
 return next target;
end; $$;
revoke all on function public.reloo_claim_price_target() from public,anon,authenticated;
grant execute on function public.reloo_claim_price_target() to service_role;
create or replace function public.reloo_finish_price_target(p_target_id uuid,p_status text,p_reason text,p_snapshot jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare target price_targets; snapshot_id uuid;
begin
 select * into target from price_targets where id=p_target_id for update;
 if not found then raise exception 'TARGET_NOT_FOUND'; end if;
 if p_status not in ('SUCCESS','BLOCKED_ROBOTS','SOURCE_UNAVAILABLE','NO_STRUCTURED_PRICE','MODEL_MISMATCH') then raise exception 'INVALID_COLLECTION_STATUS'; end if;
 if p_status='SUCCESS' then
   if p_snapshot is null then raise exception 'MISSING_SNAPSHOT'; end if;
   insert into price_snapshots(target_id,source_id,model_key,category,title,description,url,price,price_kind,condition,in_stock,verified,content_hash,extractor_version)
   values(target.id,target.source_id,target.model_key,target.category,p_snapshot->>'title',left(coalesce(p_snapshot->>'description',''),4000),p_snapshot->>'url',(p_snapshot->>'price')::bigint,target.price_kind,p_snapshot->>'condition',(p_snapshot->>'in_stock')::boolean,true,p_snapshot->>'content_hash','jsonld-product-1') returning id into snapshot_id;
 end if;
 insert into price_collection_runs(target_id,source_id,status,reason_code,snapshot_id) values(target.id,target.source_id,p_status,left(p_reason,100),snapshot_id);
 update price_targets set lease_until=null,last_status=p_status,last_checked_at=now(),next_run_at=now()+make_interval(mins=>target.interval_minutes) where id=target.id;
 update price_sources set status=p_status,last_error_code=case when p_status='SUCCESS' then null else left(p_reason,100) end,last_success_at=case when p_status='SUCCESS' then now() else last_success_at end where id=target.source_id;
 return snapshot_id;
end; $$;
revoke all on function public.reloo_finish_price_target(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_finish_price_target(uuid,text,text,jsonb) to service_role;
create or replace function public.reloo_admin_market_write(p_actor_id text,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare record jsonb;target_id uuid;
begin
 perform reloo_assert_active(p_actor_id);
 if not exists(select 1 from profiles where id=p_actor_id and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 if p_action='source' then
   update price_sources set enabled=(p_data->>'enabled')::boolean,access_basis=p_data->>'access_basis',status=case when (p_data->>'enabled')::boolean then 'READY' else 'NOT_CONNECTED' end where id=p_data->>'id';
   if not found then raise exception 'SOURCE_NOT_FOUND'; end if;
 elsif p_action='target' then
   insert into price_targets(source_id,url,brand,model,variant,model_key,category,price_kind,condition,permission_note,interval_minutes)
   values(p_data->>'source_id',p_data->>'url',p_data->>'brand',p_data->>'model',p_data->>'variant',p_data->>'model_key',p_data->>'category',p_data->>'price_kind',p_data->>'condition',p_data->>'permission_note',(p_data->>'interval_minutes')::integer)
   on conflict(source_id,url) do update set brand=excluded.brand,model=excluded.model,variant=excluded.variant,model_key=excluded.model_key,category=excluded.category,price_kind=excluded.price_kind,condition=excluded.condition,permission_note=excluded.permission_note,interval_minutes=excluded.interval_minutes,next_run_at=now() returning id into target_id;
 elsif p_action='catalog' then
   if jsonb_typeof(p_data)<>'array' or jsonb_array_length(p_data)>300 then raise exception 'INVALID_FEED'; end if;
   for record in select value from jsonb_array_elements(p_data) loop
     insert into affiliate_products(id,source,merchant,title,image_url,original_url,price,category,commission_bps,in_stock,source_updated_at,expires_at,source_reference)
     values(record->>'id',record->>'source',record->>'merchant',record->>'title',record->>'image_url',record->>'original_url',(record->>'price')::bigint,record->>'category',(record->>'commission_bps')::integer,(record->>'in_stock')::boolean,(record->>'source_updated_at')::timestamptz,(record->>'expires_at')::timestamptz,record->>'source_reference')
     on conflict(id) do update set title=excluded.title,image_url=excluded.image_url,original_url=excluded.original_url,price=excluded.price,category=excluded.category,commission_bps=excluded.commission_bps,in_stock=excluded.in_stock,source_updated_at=excluded.source_updated_at,expires_at=excluded.expires_at,source_reference=excluded.source_reference where affiliate_products.source_updated_at<excluded.source_updated_at;
   end loop;
 else raise exception 'INVALID_ACTION'; end if;
 insert into security_audit(actor_id,action,details) values(p_actor_id,'MARKET_DATA_'||upper(p_action),jsonb_build_object('sourceId',p_data->>'source_id','targetId',target_id,'rows',case when p_action='catalog' then jsonb_array_length(p_data) else 1 end));
 return jsonb_build_object('ok',true,'targetId',target_id);
end; $$;
revoke all on function public.reloo_admin_market_write(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_admin_market_write(text,text,jsonb) to service_role;
