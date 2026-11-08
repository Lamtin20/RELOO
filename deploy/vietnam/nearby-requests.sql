begin;
create table if not exists public.nearby_member_locations(
 profile_id text primary key references profiles(id) on delete cascade,
 province_code integer not null,province_name text not null,
 latitude double precision not null check(latitude between 8 and 24),longitude double precision not null check(longitude between 102 and 110),
 email_enabled boolean not null default false,updated_at timestamptz not null default now()
);
create index if not exists nearby_member_province on nearby_member_locations(province_code) where email_enabled;
create table if not exists public.nearby_requests(
 id uuid primary key,profile_id text not null references profiles(id) on delete cascade,
 title text not null check(length(title) between 3 and 160),description text not null check(length(description) between 10 and 2000),
 category text not null,mode text not null check(mode in ('RENT','BUY')),budget_vnd bigint check(budget_vnd between 0 and 1000000000),
 province_code integer not null,province_name text not null,latitude double precision not null check(latitude between 8 and 24),longitude double precision not null check(longitude between 102 and 110),
 images text[] not null default '{}',status text not null default 'OPEN' check(status in ('OPEN','CLOSED')),
 match_status text not null default 'PENDING',match_kind text,recipient_count integer not null default 0,
 needed_on date,expires_at timestamptz not null default now()+interval '7 days',created_at timestamptz not null default now()
);
create index if not exists nearby_request_owner on nearby_requests(profile_id,created_at);
create table if not exists public.nearby_request_deliveries(
 request_id uuid not null references nearby_requests(id) on delete cascade,profile_id text not null references profiles(id) on delete cascade,
 distance_km double precision not null check(distance_km between 0 and 10),kind text not null check(kind in ('OWNERS','COMMUNITY')),
 status text not null default 'QUEUED' check(status in ('QUEUED','SENDING','SENT','FAILED','SKIPPED')),
 provider_id text,result_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(request_id,profile_id)
);
create index if not exists nearby_delivery_pending on nearby_request_deliveries(status,created_at);
create table if not exists public.nearby_request_offers(
 request_id uuid not null references nearby_requests(id) on delete cascade,profile_id text not null references profiles(id) on delete cascade,
 asset_id text not null references assets(id) on delete cascade,created_at timestamptz not null default now(),primary key(request_id,profile_id)
);
alter table nearby_member_locations enable row level security;
alter table nearby_requests enable row level security;
alter table nearby_request_deliveries enable row level security;
alter table nearby_request_offers enable row level security;
revoke all on nearby_member_locations,nearby_requests,nearby_request_deliveries,nearby_request_offers from public,anon,authenticated;
grant all on nearby_member_locations,nearby_requests,nearby_request_deliveries,nearby_request_offers to service_role;
create or replace function public.reloo_create_nearby_request(p_actor text,p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('nearby-create:'||p_actor,0));
 if exists(select 1 from nearby_requests where id=p_id and profile_id=p_actor) then return p_id;end if;
 perform reloo_assert_active(p_actor);
 if (select count(*) from nearby_requests where profile_id=p_actor and created_at>now()-interval '24 hours')>=3 then raise exception 'NEARBY_DAILY_LIMIT';end if;
 insert into nearby_requests(id,profile_id,title,description,category,mode,budget_vnd,province_code,province_name,latitude,longitude,images,needed_on)
 values(p_id,p_actor,p_data->>'title',p_data->>'description',p_data->>'category',p_data->>'mode',(p_data->>'budget_vnd')::bigint,(p_data->>'province_code')::integer,p_data->>'province_name',(p_data->>'latitude')::double precision,(p_data->>'longitude')::double precision,array(select jsonb_array_elements_text(p_data->'images')),(p_data->>'needed_on')::date);
 insert into automation_jobs(kind,payload) values('NEARBY_REQUEST_MATCH',jsonb_build_object('requestId',p_id));
 return p_id;
end $$;
create or replace function public.reloo_nearby_candidates(p_request uuid) returns table(profile_id text,province_code integer,distance_km double precision,assets jsonb) language sql security definer set search_path=public as $$
 select m.profile_id,m.province_code,d.km,coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'category',a.category,'status',a.status,'is_locked',a.is_locked,'listing_data',a.listing_data)) from assets a where a.owner_id=m.profile_id and a.category=r.category and a.status='available' and not coalesce(a.is_locked,false)),'[]'::jsonb)
 from nearby_requests r join profiles sender on sender.id=r.profile_id and sender.activation_status='ACTIVE' and sender.deleted_at is null
 join nearby_member_locations m on m.province_code=r.province_code and m.email_enabled and m.updated_at>now()-interval '180 days'
 join profiles p on p.id=m.profile_id and p.deleted_at is null and p.activation_status='ACTIVE' and p.email is not null
 cross join lateral(select 6371.0*2*asin(sqrt(least(1.0,power(sin(radians(m.latitude-r.latitude)/2),2)+cos(radians(r.latitude))*cos(radians(m.latitude))*power(sin(radians(m.longitude-r.longitude)/2),2)))) as km) d
 where r.id=p_request and r.status='OPEN' and r.expires_at>now() and m.profile_id<>r.profile_id and d.km<=10 order by d.km,m.profile_id;
$$;
create or replace function public.reloo_queue_nearby_deliveries(p_request uuid,p_kind text,p_members jsonb) returns integer language plpgsql security definer set search_path=public as $$
declare recipient record;n integer:=0;
begin
 perform 1 from nearby_requests where id=p_request and status='OPEN' and expires_at>now() for update;
 if not found then return 0;end if;
 if exists(select 1 from nearby_requests where id=p_request and match_status='MATCHED') then return 0;end if;
 if p_kind not in ('OWNERS','COMMUNITY') or jsonb_array_length(p_members)>50 then raise exception 'NEARBY_INVALID_RECIPIENTS';end if;
 for recipient in select c.* from reloo_nearby_candidates(p_request) c where c.profile_id in(select value->>'profile_id' from jsonb_array_elements(p_members)) order by c.distance_km,c.profile_id loop
  perform pg_advisory_xact_lock(hashtextextended('nearby-recipient:'||recipient.profile_id,0));
  if (select count(*) from nearby_request_deliveries where profile_id=recipient.profile_id and created_at>now()-interval '24 hours' and status<>'SKIPPED')>=3 then continue;end if;
  insert into nearby_request_deliveries(request_id,profile_id,distance_km,kind) values(p_request,recipient.profile_id,recipient.distance_km,p_kind) on conflict do nothing;
  if found then n:=n+1;end if;
 end loop;
 update nearby_requests set match_status='MATCHED',match_kind=p_kind,recipient_count=n where id=p_request;
 return n;
end $$;
create or replace function public.reloo_claim_nearby_email(p_request uuid,p_recipient text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('nearby-recipient:'||p_recipient,0));
 if (select count(*) from nearby_request_deliveries where profile_id=p_recipient and status in ('SENDING','SENT','FAILED') and updated_at>now()-interval '24 hours')>=3 then return false;end if;
 update nearby_request_deliveries set status='SENDING',updated_at=now() where request_id=p_request and profile_id=p_recipient and status='QUEUED';
 return found;
end $$;
create or replace function public.reloo_offer_nearby_request(p_actor text,p_request uuid,p_asset text) returns void language plpgsql security definer set search_path=public as $$
declare r nearby_requests;a assets;
begin
 select * into r from nearby_requests where id=p_request for update;
 if not found or r.status<>'OPEN' or r.expires_at<=now() or r.profile_id=p_actor or not exists(select 1 from profiles where id=r.profile_id and activation_status='ACTIVE' and deleted_at is null) or not exists(select 1 from nearby_request_deliveries where request_id=p_request and profile_id=p_actor) then raise exception 'NEARBY_OFFER_FORBIDDEN';end if;
 perform reloo_assert_active(p_actor);
 select * into a from assets where id=p_asset and owner_id=p_actor and category=r.category and status='available' and not coalesce(is_locked,false);
 if not found or (r.mode='BUY' and coalesce(a.listing_data->>'transactionMode','RENTAL') not in ('SALE','BOTH')) or (r.mode='RENT' and a.listing_data->>'transactionMode'='SALE') then raise exception 'NEARBY_ASSET_INVALID';end if;
 insert into nearby_request_offers(request_id,profile_id,asset_id) values(p_request,p_actor,p_asset) on conflict(request_id,profile_id) do update set asset_id=excluded.asset_id;
 perform reloo_emit_notification('system','nearby-offer:'||p_request::text||':'||p_actor,r.profile_id,'Có người có món đồ bạn đang tìm',a.title,'/needs/'||p_request::text);
end $$;
revoke all on function reloo_create_nearby_request(text,uuid,jsonb),reloo_nearby_candidates(uuid),reloo_queue_nearby_deliveries(uuid,text,jsonb),reloo_claim_nearby_email(uuid,text),reloo_offer_nearby_request(text,uuid,text) from public,anon,authenticated;
grant execute on function reloo_create_nearby_request(text,uuid,jsonb),reloo_nearby_candidates(uuid),reloo_queue_nearby_deliveries(uuid,text,jsonb),reloo_claim_nearby_email(uuid,text),reloo_offer_nearby_request(text,uuid,text) to service_role;
commit;
