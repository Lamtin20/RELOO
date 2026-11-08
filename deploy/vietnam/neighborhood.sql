-- Additive; apply ONLY to an approved environment, then security-lockdown.sql.
begin;
create table if not exists nk_sources(
 id uuid primary key default gen_random_uuid(),name text not null,provider text not null check(provider in ('MANUAL','PARTNER_JSON')),
 terms text not null,attribution text not null default '',storage_allowed boolean not null default false,
 feed_url text,sync_minutes integer not null default 1440 check(sync_minutes between 60 and 43200),enabled boolean not null default false,
 last_success timestamptz,last_error text,next_run timestamptz,failures integer not null default 0,version integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table nk_sources add column if not exists last_attempt timestamptz;
insert into nk_sources(id,name,provider,terms,storage_allowed) values('00000000-0000-4000-8000-000000000001','RELOO reviewed contributions','MANUAL','Contributor must hold the necessary rights; review and attribution required.',true) on conflict do nothing;
create table if not exists nk_places(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('AREA','SUBZONE','BUILDING','HANDOVER')),
 parent_id uuid references nk_places(id),name text not null check(length(name) between 2 and 160),aliases text[] not null default '{}',
 address_raw text not null default '',address_normalized text not null default '',administrative jsonb not null default '{}',
 geometry jsonb,source_id uuid not null references nk_sources(id),external_id text,source_version text,
 confidence numeric not null default 0 check(confidence between 0 and 1),verification text not null default 'UNREVIEWED',
 status text not null default 'PENDING' check(status in ('PENDING','ACTIVE','ARCHIVED')),admin_locked boolean not null default false,
 enabled boolean not null default false,merged_into uuid references nk_places(id),version integer not null default 1,
 updated_at timestamptz not null default now(),unique(source_id,external_id),check((kind='AREA')=(parent_id is null)),
 check(geometry is null or geometry->>'type' in ('Point','Polygon','MultiPolygon'))
);
create index if not exists nk_place_parent on nk_places(parent_id,status);
create table if not exists nk_place_changes(
 id uuid primary key default gen_random_uuid(),source_id uuid not null references nk_sources(id),external_id text not null,
 place_id uuid references nk_places(id),proposal jsonb not null,status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 fingerprint text not null,created_at timestamptz not null default now(),unique(source_id,external_id,fingerprint)
);
create table if not exists nk_audit(
 id uuid primary key default gen_random_uuid(),actor_id text,resource_id text not null,action text not null,
 before_data jsonb,after_data jsonb,reason text,correlation_id uuid not null,created_at timestamptz not null default now()
);
create table if not exists nk_memberships(
 id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),area_id uuid not null references nk_places(id),
 building_id uuid references nk_places(id),status text not null default 'SELECTED' check(status in ('SELECTED','PENDING','VERIFIED','REVERIFY','REJECTED','REVOKED')),
 public_building boolean not null default false,verified_until timestamptz,reason text,updated_at timestamptz not null default now(),unique(profile_id,area_id)
);
create table if not exists nk_verifications(
 id uuid primary key default gen_random_uuid(),membership_id uuid not null references nk_memberships(id),method text not null check(method in ('INVITE','MANUAL','PARTNER')),
 status text not null default 'PENDING',note text,reviewed_by text,reason text,created_at timestamptz not null default now(),reviewed_at timestamptz
);
create table if not exists nk_invites(
 id uuid primary key default gen_random_uuid(),code_hash text not null unique,area_id uuid not null references nk_places(id),building_id uuid references nk_places(id),
 intended_profile text references profiles(id),expires_at timestamptz not null,used_by text references profiles(id),created_by text not null references profiles(id),created_at timestamptz not null default now()
);
create table if not exists nk_policies(
 id uuid primary key default gen_random_uuid(),area_id uuid not null references nk_places(id),version integer not null,
 terms jsonb not null,fee_bps integer not null default 0 check(fee_bps between 0 and 10000),hold_minutes integer not null default 30 check(hold_minutes between 5 and 1440),
 payment_minutes integer not null default 30 check(payment_minutes between 5 and 1440),cancel_before_hours integer not null default 24 check(cancel_before_hours between 0 and 720),
 published_by text not null references profiles(id),effective_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(area_id,version)
);
create table if not exists nk_listings(
 asset_id text primary key references assets(id),owner_id text not null references profiles(id),area_id uuid not null references nk_places(id),
 subzone_id uuid references nk_places(id),building_id uuid references nk_places(id),handover_id uuid not null references nk_places(id),
 scope text not null check(scope in ('BUILDING','SUBZONE','AREA')),verified_only boolean not null default false,instant boolean not null default false,
 rate bigint not null check(rate between 1 and 1000000000),unit_minutes integer not null check(unit_minutes in (60,1440)),deposit bigint not null default 0 check(deposit between 0 and 1000000000),
 min_minutes integer not null default 60 check(min_minutes between 60 and 129600),buffer_minutes integer not null default 30 check(buffer_minutes between 0 and 1440),
 accessories jsonb not null default '[]',condition text not null,instructions text not null default '',
 status text not null default 'PENDING' check(status in ('PENDING','ACTIVE','PAUSED','REJECTED')),version integer not null default 1,updated_at timestamptz not null default now()
);
create table if not exists nk_blocks(
 id uuid primary key default gen_random_uuid(),asset_id text not null references nk_listings(asset_id),starts_at timestamptz not null,ends_at timestamptz not null,
 created_by text not null references profiles(id),check(ends_at>starts_at)
);
create table if not exists nk_needs(
 id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),area_id uuid not null references nk_places(id),
 subzone_id uuid references nk_places(id),building_id uuid references nk_places(id),scope text not null check(scope in ('BUILDING','SUBZONE','AREA')),
 title text not null,category text not null,note text not null default '',starts_at timestamptz not null,ends_at timestamptz not null,budget bigint,
 images jsonb not null default '[]',status text not null default 'OPEN' check(status in ('OPEN','CLOSED','CANCELLED')),expires_at timestamptz not null,
 created_at timestamptz not null default now(),check(ends_at>starts_at),check(budget is null or budget between 0 and 1000000000)
);
create table if not exists nk_offers(
 id uuid primary key default gen_random_uuid(),need_id uuid not null references nk_needs(id),asset_id text not null references nk_listings(asset_id),
 owner_id text not null references profiles(id),note text not null default '',created_at timestamptz not null default now(),unique(need_id,asset_id)
);
create table if not exists nk_orders(
 id uuid primary key default gen_random_uuid(),asset_id text not null references nk_listings(asset_id),owner_id text not null references profiles(id),renter_id text not null references profiles(id),
 area_id uuid not null references nk_places(id),need_id uuid references nk_needs(id),offer_id uuid references nk_offers(id),handover_id uuid not null references nk_places(id),
 starts_at timestamptz not null,ends_at timestamptz not null,block_until timestamptz not null,hold_until timestamptz,
 status text not null default 'PENDING_OWNER' check(status in ('DRAFT','PENDING_OWNER','PENDING_PAYMENT','CONFIRMED','READY_FOR_HANDOVER','ACTIVE','RETURN_PENDING','COMPLETED','CANCELLED','EXPIRED')),
 payment_status text not null default 'UNPAID' check(payment_status in ('UNPAID','REPORTED','PAID')),
 deposit_status text not null default 'NOT_REQUIRED' check(deposit_status in ('NOT_REQUIRED','UNPAID','HELD_DIRECT','RETURN_REPORTED','RETURNED')),
 refund_status text not null default 'NONE' check(refund_status in ('NONE','REFUND_PENDING','RETURN_REPORTED','REFUNDED')),
 dispute_status text not null default 'NONE' check(dispute_status in ('NONE','DISPUTED','RESOLVED')),
 snapshot jsonb not null,handover_snapshot jsonb,version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at>starts_at),check(owner_id<>renter_id)
);
create index if not exists nk_order_calendar on nk_orders(asset_id,starts_at,block_until);
alter table nk_orders add column if not exists handover_snapshot jsonb;
create index if not exists nk_order_parties on nk_orders(renter_id,owner_id);
create table if not exists nk_order_events(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references nk_orders(id),actor_id text not null,action text not null,
 data jsonb not null default '{}',correlation_id uuid not null,created_at timestamptz not null default now()
);
create table if not exists nk_handover_codes(
 order_id uuid not null references nk_orders(id),phase text not null check(phase in ('PICKUP','RETURN')),code_hash text not null,
 issuer text not null,expires_at timestamptz not null,attempts integer not null default 0,consumed_at timestamptz,created_at timestamptz not null default now(),primary key(order_id,phase)
);
create table if not exists nk_handover_checks(
 order_id uuid not null references nk_orders(id),phase text not null,profile_id text not null references profiles(id),
 checklist jsonb not null,images jsonb not null,condition text not null,confirmed_at timestamptz not null default now(),primary key(order_id,phase,profile_id)
);
create table if not exists nk_extensions(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references nk_orders(id),ends_at timestamptz not null,extra bigint not null,
 extra_fee bigint not null default 0,
 status text not null default 'PENDING' check(status in ('PENDING','ACCEPTED','REJECTED','APPLIED')),created_at timestamptz not null default now()
);
create unique index if not exists nk_one_extension on nk_extensions(order_id) where status in ('PENDING','ACCEPTED');
alter table nk_extensions add column if not exists extra_fee bigint not null default 0;
create table if not exists nk_disputes(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references nk_orders(id),profile_id text not null references profiles(id),
 note text not null,images jsonb not null default '[]',resolution text,status text not null default 'OPEN',created_at timestamptz not null default now()
);
create unique index if not exists nk_one_open_dispute_per_party on nk_disputes(order_id,profile_id) where status='OPEN';
create table if not exists nk_reviews(
 -- Reviews are submitted by transaction participants only through the RPC.
 order_id uuid not null references nk_orders(id),profile_id text not null references profiles(id),rating integer not null check(rating between 1 and 5),
 note text not null,created_at timestamptz not null default now(),primary key(order_id,profile_id)
);
create table if not exists nk_preferences(
 profile_id text primary key references profiles(id),locale text not null default 'vi-VN' check(locale in ('vi-VN','en-US')),
 match_enabled boolean not null default false,marketing_enabled boolean not null default false,
 quiet_start integer not null default 22 check(quiet_start between 0 and 23),quiet_end integer not null default 7 check(quiet_end between 0 and 23),daily_cap integer not null default 3 check(daily_cap between 1 and 10)
);
create table if not exists nk_outbox(
 id uuid primary key default gen_random_uuid(),event text not null,category text not null default 'transaction',aggregate_id text not null,
 recipient_id text not null references profiles(id),correlation_id uuid not null,dedup_key text not null unique,
 status text not null default 'QUEUED' check(status in ('QUEUED','SENT','SKIPPED','FAILED','DEAD')),attempts integer not null default 0,
 available_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',delivered_at timestamptz,last_error text,
 created_at timestamptz not null default now()
);
alter table nk_outbox add column if not exists priority integer generated always as (case when category='transaction' then 0 else 1 end) stored;
create index if not exists nk_outbox_due on nk_outbox(status,priority,available_at,created_at);
create table if not exists nk_operations(
 actor_id text not null,key uuid not null,action text not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,key)
);
create table if not exists nk_sync_runs(
 id uuid primary key default gen_random_uuid(),source_id uuid not null references nk_sources(id),status text not null default 'RUNNING',
 imported integer not null default 0,result_code text,started_at timestamptz not null default now(),finished_at timestamptz
);
create table if not exists nk_promotions(
 id uuid primary key default gen_random_uuid(),area_id uuid not null references nk_places(id),enabled boolean not null default false,
 budget bigint not null check(budget>=0),amount bigint not null check(amount>0),used bigint not null default 0,expires_at timestamptz not null,verified_only boolean not null default true
);
create table if not exists nk_promotion_claims(order_id uuid primary key references nk_orders(id),promotion_id uuid not null references nk_promotions(id),profile_id text not null references profiles(id),amount bigint not null,unique(promotion_id,profile_id));
alter table nk_listings add column if not exists handover_start integer not null default 0 check(handover_start between 0 and 23);
alter table nk_listings add column if not exists handover_end integer not null default 24 check(handover_end between 1 and 24);
create or replace function nk_handover_window(p_asset text,p_start timestamptz,p_end timestamptz) returns boolean language sql stable set search_path=public as $$
 with hours as(select extract(hour from p_start at time zone 'Asia/Ho_Chi_Minh')+extract(minute from p_start at time zone 'Asia/Ho_Chi_Minh')/60 s,
 coalesce(nullif(extract(hour from p_end at time zone 'Asia/Ho_Chi_Minh')+extract(minute from p_end at time zone 'Asia/Ho_Chi_Minh')/60,0),24) e)
 select case when l.handover_start<l.handover_end then s>=l.handover_start and s<l.handover_end and e<=l.handover_end and e>=l.handover_start
 else (s>=l.handover_start or s<l.handover_end) and (e>=l.handover_start or e<=l.handover_end) end from nk_listings l cross join hours where asset_id=p_asset
$$;

create or replace function nk_immutable() returns trigger language plpgsql as $$begin raise exception 'IMMUTABLE_RECORD';end $$;
drop trigger if exists nk_audit_immutable on nk_audit;
create trigger nk_audit_immutable before update or delete on nk_audit for each row execute function nk_immutable();
drop trigger if exists nk_events_immutable on nk_order_events;
create trigger nk_events_immutable before update or delete on nk_order_events for each row execute function nk_immutable();
drop trigger if exists nk_policies_immutable on nk_policies;
create trigger nk_policies_immutable before update or delete on nk_policies for each row execute function nk_immutable();

create or replace function nk_area(p_id uuid) returns uuid language sql stable set search_path=public as $$
 with recursive chain as(select id,parent_id,kind,1 depth from nk_places where id=p_id union all select p.id,p.parent_id,p.kind,c.depth+1 from nk_places p join chain c on p.id=c.parent_id where c.depth<5)
 select id from chain where kind='AREA' limit 1
$$;
create or replace function nk_place_guard() returns trigger language plpgsql set search_path=public as $$
declare parent nk_places;
begin
 if new.parent_id=new.id then raise exception 'INVALID_INPUT';end if;
 if new.parent_id is not null then select * into parent from nk_places where id=new.parent_id;
 if not found or not ((new.kind='SUBZONE' and parent.kind='AREA') or (new.kind='BUILDING' and parent.kind in ('AREA','SUBZONE')) or (new.kind='HANDOVER' and parent.kind in ('AREA','SUBZONE','BUILDING'))) then raise exception 'INVALID_INPUT';end if;end if;
 return new;
end $$;
drop trigger if exists nk_hierarchy_guard on nk_places;
create trigger nk_hierarchy_guard before insert or update on nk_places for each row execute function nk_place_guard();
create or replace function nk_emit(p_event text,p_aggregate text,p_recipient text,p_correlation uuid,p_category text default 'transaction',p_suffix text default '') returns void language sql set search_path=public as $$
 insert into nk_outbox(event,aggregate_id,recipient_id,correlation_id,category,dedup_key,expires_at)
 values(p_event,p_aggregate,p_recipient,p_correlation,p_category,p_correlation::text||':'||p_event||':'||p_recipient||':'||p_suffix,now()+case when p_category='transaction' then interval '7 days' else interval '1 day' end) on conflict(dedup_key) do nothing
$$;
create or replace function nk_is_verified(p_actor text,p_area uuid,p_building uuid default null) returns boolean language sql stable set search_path=public as $$
 select exists(select 1 from nk_memberships where profile_id=p_actor and area_id=p_area and status='VERIFIED' and verified_until>now() and (p_building is null or building_id=p_building))
$$;
create or replace function nk_asset_usable(p_asset text) returns boolean language sql stable set search_path=public as $$
 select exists(select 1 from assets where id=p_asset and (status='available' or (status='paused' and listing_data->>'neighborhoodOnly'='true')) and not coalesce(is_locked,false) and upper(coalesce(dispute_status,'')) not in ('OPEN','DISPUTED','ACTIVE','PENDING'))
$$;
create or replace function nk_normalize(p_value text) returns text language sql immutable as $$
 select trim(regexp_replace(translate(regexp_replace(normalize(coalesce(p_value,''),NFD),U&'[\0300-\036f]','','g'),'ABCDEFGHIJKLMNOPQRSTUVWXYZĐđ','abcdefghijklmnopqrstuvwxyzdd'),'[^a-z0-9]+',' ','g'))
$$;
create or replace function nk_listing_geo_valid(p_asset text) returns boolean language sql stable set search_path=public as $$
 select exists(select 1 from nk_listings l
 join nk_places area on area.id=l.area_id and area.kind='AREA' and area.status='ACTIVE'
 join nk_places point on point.id=l.handover_id and point.kind='HANDOVER' and point.status='ACTIVE'
 where l.asset_id=p_asset and nk_area(point.id)=l.area_id
 and (l.building_id is null or exists(select 1 from nk_places b where b.id=l.building_id and b.kind='BUILDING' and b.status='ACTIVE' and nk_area(b.id)=l.area_id))
 and (l.subzone_id is null or exists(select 1 from nk_places z where z.id=l.subzone_id and z.kind='SUBZONE' and z.status='ACTIVE' and z.parent_id=l.area_id)))
$$;
create or replace function nk_match_score(p_title text,p_query text) returns numeric language sql immutable as $$
 with words as(select distinct word from unnest(string_to_array(nk_normalize(p_query),' ')) word where length(word)>1 and word not in ('can','thue','mua','tim','mot','chiec','cai','cho','toi','muon','test'))
 select case when trim(coalesce(p_query,''))='' then 1 when count(*)=0 then 0 else count(*) filter(where position(' '||word||' ' in ' '||nk_normalize(p_title)||' ')>0)::numeric/count(*) end from words
$$;
create or replace function nk_eligible(p_actor text,p_asset text) returns boolean language plpgsql stable set search_path=public as $$
declare l nk_listings;
begin
 select * into l from nk_listings where asset_id=p_asset;
 if not found then return false;end if;
 if l.scope='BUILDING' and not exists(select 1 from nk_memberships where profile_id=p_actor and building_id=l.building_id and status not in ('REVOKED','REJECTED')) then return false;end if;
 if l.scope='SUBZONE' and not exists(select 1 from nk_memberships m join nk_places b on b.id=m.building_id where m.profile_id=p_actor and m.area_id=l.area_id and b.parent_id=l.subzone_id and m.status not in ('REVOKED','REJECTED')) then return false;end if;
 return not l.verified_only or nk_is_verified(p_actor,l.area_id,case when l.scope='BUILDING' then l.building_id else null end);
end $$;
create or replace function nk_calendar_free(p_asset text,p_start timestamptz,p_end timestamptz,p_buffer integer,p_exclude uuid default null) returns boolean language sql stable set search_path=public as $$
 select p_end>p_start
 and not exists(select 1 from nk_orders where asset_id=p_asset and id is distinct from p_exclude and (status in ('CONFIRMED','READY_FOR_HANDOVER','ACTIVE','RETURN_PENDING') or (status in ('PENDING_OWNER','PENDING_PAYMENT') and hold_until>now())) and (status in ('ACTIVE','RETURN_PENDING') and ends_at<now() or (starts_at<p_end+make_interval(mins=>p_buffer) and block_until>p_start)))
 and not exists(select 1 from nk_blocks where asset_id=p_asset and starts_at<p_end+make_interval(mins=>p_buffer) and ends_at>p_start-make_interval(mins=>p_buffer))
 and not exists(select 1 from rental_agreements where listing_id=p_asset and status in ('ACCEPTED','ACTIVE','DISPUTED') and starts_at<p_end+make_interval(mins=>p_buffer) and ends_at>p_start-make_interval(mins=>p_buffer))
 and not exists(select 1 from transactions where asset_id=p_asset and status not in ('cancelled','completed','returned','CANCELLED','COMPLETED','pending','DRAFT','EXPIRED') and (start_date is null or end_date is null or ((start_date::timestamp at time zone 'Asia/Ho_Chi_Minh')<p_end+make_interval(mins=>p_buffer) and ((end_date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh')>p_start-make_interval(mins=>p_buffer))))
$$;
create or replace function nk_quote(p_asset text,p_start timestamptz,p_end timestamptz) returns jsonb language plpgsql stable set search_path=public as $$
declare l nk_listings;p nk_policies;units bigint;rent bigint;fee bigint;total bigint;
begin
 select * into l from nk_listings where asset_id=p_asset and status='ACTIVE';if not found then raise exception 'NOT_FOUND';end if;
 if not nk_listing_geo_valid(p_asset) then raise exception 'AREA_DISABLED';end if;
 select * into p from nk_policies where area_id=l.area_id and effective_at<=now() order by version desc limit 1;if not found then raise exception 'POLICY_CHANGED';end if;
 if p_start<now()-interval '5 minutes' or p_end<=p_start or p_end>p_start+interval '90 days' or extract(epoch from p_end-p_start)/60<l.min_minutes then raise exception 'INVALID_TIME';end if;
 if not nk_handover_window(p_asset,p_start,p_end) then raise exception 'INVALID_TIME';end if;
 units:=ceil(extract(epoch from p_end-p_start)/(l.unit_minutes*60));rent:=units*l.rate;fee:=ceil(rent*p.fee_bps::numeric/10000);total:=rent+fee+l.deposit;if total>1000000000 then raise exception 'INVALID_INPUT';end if;
 return jsonb_build_object('assetTitle',(select title from assets where id=p_asset),'assetImages',(select images from assets where id=p_asset),'areaName',(select name from nk_places where id=l.area_id),'units',units,'rent',rent,'fee',fee,'feeBps',p.fee_bps,'deposit',l.deposit,'total',total,'rate',l.rate,'unitMinutes',l.unit_minutes,'policyVersion',p.version,'listingVersion',l.version,'terms',p.terms,'holdMinutes',p.hold_minutes,'paymentMinutes',p.payment_minutes,'cancelBeforeHours',p.cancel_before_hours,'bufferMinutes',l.buffer_minutes,'accessories',l.accessories,'condition',l.condition,'instructions',l.instructions,'paymentMode','DIRECT_ACKNOWLEDGEMENT','currency','VND');
end $$;

-- Prevent reservations in legacy pathways from crossing a neighborhood hold.
create or replace function nk_legacy_calendar_guard() returns trigger language plpgsql set search_path=public as $$
declare v_asset text;s timestamptz;e timestamptz;
begin
 if tg_table_name='rental_agreements' then v_asset:=new.listing_id;else v_asset:=new.asset_id;end if;
 if tg_op='INSERT' and exists(select 1 from assets where id=v_asset and listing_data->>'neighborhoodOnly'='true') then raise exception 'NEIGHBORHOOD_CHECKOUT_REQUIRED';end if;
 if tg_table_name='rental_agreements' then
 if new.status not in ('ACCEPTED','ACTIVE','DISPUTED') then return new;end if;v_asset:=new.listing_id;s:=new.starts_at;e:=new.ends_at;
 else
 if new.status in ('cancelled','completed','returned','CANCELLED','COMPLETED','pending','DRAFT','EXPIRED') then return new;end if;v_asset:=new.asset_id;s:=coalesce(new.start_date::timestamp at time zone 'Asia/Ho_Chi_Minh','-infinity'::timestamptz);e:=coalesce((new.end_date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh','infinity'::timestamptz);end if;
 perform 1 from assets where id=v_asset for update;
 if exists(select 1 from nk_orders where asset_id=v_asset and (status in ('CONFIRMED','READY_FOR_HANDOVER','ACTIVE','RETURN_PENDING') or (status in ('PENDING_OWNER','PENDING_PAYMENT') and hold_until>now())) and ((status in ('ACTIVE','RETURN_PENDING') and ends_at<now()) or (starts_at<e+make_interval(mins=>coalesce((snapshot->>'bufferMinutes')::integer,0)) and block_until>s))) or exists(select 1 from nk_blocks b join nk_listings settings on settings.asset_id=b.asset_id where b.asset_id=v_asset and b.starts_at<e+make_interval(mins=>settings.buffer_minutes) and b.ends_at>s-make_interval(mins=>settings.buffer_minutes)) then raise exception 'SLOT_CONFLICT';end if;return new;
end $$;
drop trigger if exists nk_legacy_rental_calendar on rental_agreements;
create trigger nk_legacy_rental_calendar before insert or update on rental_agreements for each row execute function nk_legacy_calendar_guard();
drop trigger if exists nk_legacy_order_calendar on transactions;
create trigger nk_legacy_order_calendar before insert or update on transactions for each row execute function nk_legacy_calendar_guard();

-- Grants below are repeated after all RPC definitions in neighborhood-functions.sql.
do $$declare t text;begin for t in select tablename from pg_tables where schemaname='public' and tablename like 'nk\_%' escape '\' loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;end $$;
commit;
