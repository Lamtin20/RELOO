begin;
-- Additive; service backend only. Calendar consent is not login/Gmail consent.
create table if not exists rc_preferences (
 profile_id text primary key references profiles(id), destination text not null default 'NONE' check(destination in ('NONE','GOOGLE','DEVICE','BOTH')),
 onboarding_seen_at timestamptz,locale text not null default 'vi-VN' check(locale in ('vi-VN','en-US')),return_action text not null default 'KEEP' check(return_action in ('KEEP','DELETE')),updated_at timestamptz not null default now()
);
create table if not exists rc_connections (
 id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),provider text not null check(provider in ('GOOGLE','DEVICE')),
 device_id uuid,calendar_id text,calendar_name text,email text,google_subject text,registered_email text,
 credentials_encrypted text,status text not null default 'PENDING' check(status in ('PENDING','PROVISIONING','ACTIVE','PAUSED','REAUTH','FAILED','REVIEW','DISCONNECTED')),
 provision_attempted boolean not null default false,needs_backfill boolean not null default true,consented_at timestamptz,last_error text,last_sync_at timestamptz,
 version integer not null default 1,lease_until timestamptz,next_run timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(provider<>'DEVICE' or device_id is not null)
);
create unique index if not exists rc_one_device_target on rc_connections(profile_id,device_id) where provider='DEVICE' and status<>'DISCONNECTED';
create table if not exists rc_oauth_states (
 state_hash text primary key,profile_id text not null references profiles(id),payload_encrypted text not null,expires_at timestamptz not null,consumed_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists rc_rentals (
 source text not null check(source in ('NEIGHBORHOOD','AGREEMENT','TRANSACTION')),rental_id text not null,profile_id text not null references profiles(id),
 asset_id text not null,start_at timestamptz not null,end_at timestamptz not null,state text not null check(state in ('CONFIRMED','ACTIVE','RETURNED','CANCELLED')),
 revision integer not null default 1,updated_at timestamptz not null default now(),primary key(source,rental_id),check(end_at>start_at)
);
create table if not exists rc_calendar_events (
 id uuid primary key default gen_random_uuid(),connection_id uuid not null references rc_connections(id),source text not null,rental_id text not null,
 desired_revision integer not null,synced_revision integer not null default 0,remote_id text,window_start timestamptz,window_end timestamptz,status text not null default 'QUEUED' check(status in ('QUEUED','SYNCING','SYNCED','FAILED','REAUTH','REVIEW')),
 lease_token uuid,lease_until timestamptz,attempts integer not null default 0,next_run timestamptz not null default now(),last_error text,updated_at timestamptz not null default now(),
 unique(connection_id,source,rental_id),foreign key(source,rental_id) references rc_rentals(source,rental_id)
);
create index if not exists rc_events_due on rc_calendar_events(next_run) where status in ('QUEUED','SYNCING','FAILED');
create table if not exists rc_audit(id uuid primary key default gen_random_uuid(),profile_id text references profiles(id),action text not null,connection_id uuid,created_at timestamptz not null default now());

create or replace function rc_queue_rental(p_source text,p_id text,p_profile text,p_asset text,p_start timestamptz,p_end timestamptz,p_state text) returns void language plpgsql set search_path=public as $$
declare revision_now integer;
begin
 if p_profile is null or p_start is null or p_end is null or p_end<=p_start then return;end if;
 insert into rc_rentals(source,rental_id,profile_id,asset_id,start_at,end_at,state) values(p_source,p_id,p_profile,p_asset,p_start,p_end,p_state)
 on conflict(source,rental_id) do update set start_at=excluded.start_at,end_at=excluded.end_at,state=excluded.state,revision=rc_rentals.revision+1,updated_at=now()
 where (rc_rentals.start_at,rc_rentals.end_at,rc_rentals.state) is distinct from (excluded.start_at,excluded.end_at,excluded.state)
 returning revision into revision_now;
 if revision_now is null then return;end if;
 insert into rc_calendar_events(connection_id,source,rental_id,desired_revision,window_start,window_end)
 select c.id,p_source,p_id,revision_now,p_start,p_end from rc_connections c join rc_preferences p on p.profile_id=c.profile_id
 where c.profile_id=p_profile and c.status='ACTIVE' and (p.destination=c.provider or p.destination='BOTH')
 on conflict(connection_id,source,rental_id) do update set desired_revision=excluded.desired_revision,window_start=least(rc_calendar_events.window_start,excluded.window_start),window_end=greatest(rc_calendar_events.window_end,excluded.window_end),status=case when rc_calendar_events.lease_until>now() then 'SYNCING' else 'QUEUED' end,next_run=now(),attempts=0,updated_at=now();
end $$;

create or replace function rc_capture_rental() returns trigger language plpgsql set search_path=public as $$
declare r jsonb:=to_jsonb(new);s text;
begin
 if tg_table_name='nk_orders' then
 s:=case when r->>'status' in ('CONFIRMED','READY_FOR_HANDOVER') then 'CONFIRMED' when r->>'status' in ('ACTIVE','RETURN_PENDING') then 'ACTIVE' when r->>'status'='COMPLETED' then 'RETURNED' when r->>'status' in ('CANCELLED','EXPIRED') then 'CANCELLED' end;
 if s is not null then perform rc_queue_rental('NEIGHBORHOOD',r->>'id',r->>'renter_id',r->>'asset_id',(r->>'starts_at')::timestamptz,(r->>'ends_at')::timestamptz,s);end if;
 elsif tg_table_name='rental_agreements' then
 if r->>'status'='DISPUTED' and not exists(select 1 from rc_rentals where source='AGREEMENT' and rental_id=r->>'id' and state in ('CONFIRMED','ACTIVE')) then return new;end if;
 s:=case when r->>'status'='ACCEPTED' then 'CONFIRMED' when r->>'status' in ('ACTIVE','DISPUTED') then 'ACTIVE' when r->>'status'='CLOSED' then 'RETURNED' when r->>'status'='CANCELLED' then 'CANCELLED' end;
 if s is not null then perform rc_queue_rental('AGREEMENT',r->>'id',r->>'renter_id',r->>'listing_id',(r->>'starts_at')::timestamptz,(r->>'ends_at')::timestamptz,s);end if;
 elsif tg_table_name='transactions' then
 if upper(r->>'status')='DISPUTED' and not exists(select 1 from rc_rentals where source='TRANSACTION' and rental_id=r->>'id' and state in ('CONFIRMED','ACTIVE')) then return new;end if;
 -- Agreements are canonical when a transaction points to one: never duplicate it.
 if coalesce(r->'order_data'->>'agreementId','')<>'' then return new;end if;
 s:=case when upper(r->>'status')='CONFIRMED' then 'CONFIRMED' when upper(r->>'status') in ('ACTIVE','RENTING','DISPUTED') then 'ACTIVE' when upper(r->>'status') in ('COMPLETED','RETURNED') then 'RETURNED' when upper(r->>'status')='CANCELLED' then 'CANCELLED' end;
 if s is not null and r->>'start_date' is not null and r->>'end_date' is not null then perform rc_queue_rental('TRANSACTION',r->>'id',coalesce(r->>'renter_id',r->>'borrower_id'),r->>'asset_id',((r->>'start_date')::date::timestamp at time zone 'Asia/Ho_Chi_Minh'),(((r->>'end_date')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'),s);end if;
 end if;return new;
end $$;
do $$declare t text;begin foreach t in array array['nk_orders','rental_agreements','transactions'] loop
 if to_regclass('public.'||t) is not null then execute format('drop trigger if exists rc_rental_change on %I',t);execute format('create trigger rc_rental_change after insert or update on %I for each row execute function rc_capture_rental()',t);end if;
end loop;end $$;

create or replace function reloo_rc_backfill(p_actor text,p_connection uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from rc_connections where id=p_connection and profile_id=p_actor and status='ACTIVE') then raise exception 'FORBIDDEN';end if;
 if to_regclass('public.nk_orders') is not null then
 perform rc_queue_rental('NEIGHBORHOOD',id::text,renter_id,asset_id,starts_at,ends_at,case when status in ('CONFIRMED','READY_FOR_HANDOVER') then 'CONFIRMED' else 'ACTIVE' end)
 from nk_orders where renter_id=p_actor and status in ('CONFIRMED','READY_FOR_HANDOVER','ACTIVE','RETURN_PENDING');end if;
 if to_regclass('public.rental_agreements') is not null then
 perform rc_queue_rental('AGREEMENT',id::text,renter_id,listing_id,starts_at,ends_at,case when status='ACCEPTED' then 'CONFIRMED' else 'ACTIVE' end)
 from rental_agreements agreement where renter_id=p_actor and (status in ('ACCEPTED','ACTIVE') or status='DISPUTED' and exists(select 1 from rc_rentals where source='AGREEMENT' and rental_id=agreement.id::text and state in ('CONFIRMED','ACTIVE')));end if;
 if to_regclass('public.transactions') is not null then
 perform rc_queue_rental('TRANSACTION',r->>'id',r->>'renter_id',r->>'asset_id',((r->>'start_date')::date::timestamp at time zone 'Asia/Ho_Chi_Minh'),(((r->>'end_date')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'),case when upper(r->>'status')='CONFIRMED' then 'CONFIRMED' else 'ACTIVE' end)
 from (select to_jsonb(t) r from transactions t) data where r->>'renter_id'=p_actor and (upper(r->>'status') in ('CONFIRMED','ACTIVE','RENTING') or upper(r->>'status')='DISPUTED' and exists(select 1 from rc_rentals where source='TRANSACTION' and rental_id=r->>'id' and state in ('CONFIRMED','ACTIVE'))) and r->>'start_date' is not null and r->>'end_date' is not null and coalesce(r->'order_data'->>'agreementId','')='';end if;
 insert into rc_calendar_events(connection_id,source,rental_id,desired_revision,window_start,window_end)
 select p_connection,source,rental_id,revision,start_at,end_at from rc_rentals where profile_id=p_actor and state in ('CONFIRMED','ACTIVE')
 on conflict(connection_id,source,rental_id) do update set desired_revision=excluded.desired_revision,window_start=least(rc_calendar_events.window_start,excluded.window_start),window_end=greatest(rc_calendar_events.window_end,excluded.window_end),status='QUEUED',next_run=now(),attempts=0,lease_token=null,lease_until=null;
 update rc_calendar_events e set desired_revision=r.revision,window_start=least(e.window_start,r.start_at),window_end=greatest(e.window_end,r.end_at),status='QUEUED',next_run=now(),attempts=0,lease_token=null,lease_until=null
 from rc_rentals r where e.connection_id=p_connection and e.source=r.source and e.rental_id=r.rental_id and r.profile_id=p_actor and r.revision>e.synced_revision;
 update rc_connections set needs_backfill=false where id=p_connection;
end $$;

create or replace function reloo_rc_activate(p_actor text,p_connection uuid,p_confirm_other boolean,p_current_email text,p_email_verified boolean,p_dual boolean default false,p_locale text default null) returns void language plpgsql security definer set search_path=public as $$
declare c rc_connections;
begin
 perform pg_advisory_xact_lock(hashtextextended('rc-profile:'||p_actor,0));
 select * into c from rc_connections where id=p_connection and profile_id=p_actor for update;
 if not found or c.status not in ('PENDING','PAUSED','FAILED','REVIEW','ACTIVE') then raise exception 'INVALID_STATE';end if;
 if c.provider='GOOGLE' and (not p_email_verified or lower(coalesce(c.email,''))<>lower(coalesce(p_current_email,''))) and not p_confirm_other then raise exception 'ACCOUNT_CONFIRMATION_REQUIRED';end if;
 if p_locale is not null and p_locale not in ('vi-VN','en-US') then raise exception 'INVALID_INPUT';end if;
 insert into rc_preferences(profile_id,destination,locale) values(p_actor,case when coalesce(p_dual,false) then 'BOTH' else c.provider end,coalesce(p_locale,'vi-VN')) on conflict(profile_id) do update set destination=excluded.destination,locale=coalesce(p_locale,rc_preferences.locale),updated_at=now();
 update rc_connections set status='PAUSED',updated_at=now() where profile_id=p_actor and status='ACTIVE' and ((not coalesce(p_dual,false) and provider<>c.provider) or (c.provider='GOOGLE' and provider='GOOGLE')) and id<>c.id;
 update rc_connections set status=case when provider='GOOGLE' then 'PROVISIONING' else 'ACTIVE' end,consented_at=now(),last_error=null,next_run=now(),version=version+1,updated_at=now() where id=c.id;
 insert into rc_audit(profile_id,connection_id,action) values(p_actor,c.id,'CONSENT_ACTIVATE');
 if c.provider='DEVICE' then perform reloo_rc_backfill(p_actor,c.id);end if;
end $$;

create or replace function reloo_rc_device(p_actor text,p_device uuid,p_calendar text,p_name text,p_confirm boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare active_target rc_connections;selected rc_connections;result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('rc-profile:'||p_actor,0));
 if p_device is null or length(p_calendar) not between 1 and 300 or length(p_name)>100 or not exists(select 1 from profiles where id=p_actor and deleted_at is null) then raise exception 'INVALID_INPUT';end if;
 select * into active_target from rc_connections where profile_id=p_actor and provider='DEVICE' and device_id=p_device and status<>'DISCONNECTED' for update;
 if active_target.id is not null and active_target.calendar_id<>p_calendar and not p_confirm then raise exception 'DESTINATION_CONFIRMATION_REQUIRED';end if;
 select * into selected from rc_connections where profile_id=p_actor and provider='DEVICE' and device_id=p_device and calendar_id=p_calendar order by created_at desc limit 1 for update;
 if active_target.id is not null and active_target.id is distinct from selected.id then update rc_connections set status='DISCONNECTED',version=version+1 where id=active_target.id;end if;
 if selected.id is not null then update rc_connections set status='PENDING',calendar_name=p_name,version=version+1,updated_at=now() where id=selected.id;result:=selected.id;
 else insert into rc_connections(profile_id,provider,device_id,calendar_id,calendar_name) values(p_actor,'DEVICE',p_device,p_calendar,p_name) returning id into result;end if;
 return result;
end $$;
create or replace function reloo_rc_permission_lost(p_actor text,p_device uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('rc-profile:'||p_actor,0));
 update rc_connections set status='REAUTH',last_error='REAUTH',updated_at=now() where profile_id=p_actor and device_id=p_device and provider='DEVICE' and status='ACTIVE';
 update rc_calendar_events e set status='REAUTH',last_error='REAUTH',lease_token=null,lease_until=null,updated_at=now()
 from rc_connections c where e.connection_id=c.id and c.profile_id=p_actor and c.device_id=p_device and c.provider='DEVICE' and c.status='REAUTH' and e.synced_revision<e.desired_revision;
end $$;
create or replace function reloo_rc_claim(p_actor text default null,p_device uuid default null) returns setof jsonb language plpgsql security definer set search_path=public as $$
declare e rc_calendar_events;c rc_connections;r rc_rentals;token uuid;
begin
 for e in select event.* from rc_calendar_events event join rc_connections conn on conn.id=event.connection_id join rc_preferences pref on pref.profile_id=conn.profile_id
 where conn.status='ACTIVE' and (conn.provider=pref.destination or pref.destination='BOTH') and event.next_run<=now() and (event.lease_until is null or event.lease_until<=now())
 and event.status in ('QUEUED','SYNCING','FAILED') and event.attempts<5
 and ((p_actor is null and conn.provider='GOOGLE') or (p_actor=conn.profile_id and conn.provider='DEVICE' and conn.device_id=p_device))
 order by event.next_run for update of event skip locked limit 20 loop
 token:=gen_random_uuid();update rc_calendar_events set status='SYNCING',lease_token=token,lease_until=now()+interval '2 minutes',attempts=attempts+1 where id=e.id;
 select * into c from rc_connections where id=e.connection_id;select * into r from rc_rentals where source=e.source and rental_id=e.rental_id;
 return next jsonb_build_object('id',e.id,'lease',token,'revision',e.desired_revision,'connection',c.id,'profile',c.profile_id,'calendar',c.calendar_id,'remoteId',e.remote_id,'source',e.source,'rental',e.rental_id,'start',r.start_at,'end',r.end_at,'recoveryStart',coalesce(e.window_start,r.start_at),'recoveryEnd',coalesce(e.window_end,r.end_at),'state',r.state,'locale',(select locale from rc_preferences where profile_id=c.profile_id),'returnAction',(select return_action from rc_preferences where profile_id=c.profile_id));
 end loop;
end $$;

create or replace function reloo_rc_ack(p_actor text,p_id uuid,p_lease uuid,p_revision integer,p_remote text,p_result text) returns text language plpgsql security definer set search_path=public as $$
declare e rc_calendar_events;c rc_connections;
begin
 select * into e from rc_calendar_events where id=p_id for update;select * into c from rc_connections where id=e.connection_id;
 if c.profile_id=p_actor and p_result='SYNCED' and e.synced_revision>=p_revision and e.remote_id=p_remote then return 'SYNCED';end if;
 if c.profile_id is distinct from p_actor or e.lease_token is distinct from p_lease or e.lease_until<=now() then raise exception 'FORBIDDEN';end if;
 if p_revision>e.desired_revision or p_result not in ('SYNCED','FAILED','REAUTH','REVIEW') or length(coalesce(p_remote,''))>1024 then raise exception 'INVALID_INPUT';end if;
 update rc_calendar_events set synced_revision=case when p_result='SYNCED' then greatest(synced_revision,p_revision) else synced_revision end,
 remote_id=coalesce(nullif(p_remote,''),remote_id),status=case when p_result='SYNCED' and desired_revision>p_revision then 'QUEUED' else p_result end,
 last_error=case when p_result='SYNCED' then null else p_result end,lease_token=null,lease_until=null,next_run=now()+case when p_result='SYNCED' then interval '0 seconds' else make_interval(secs=>least(3600,30*(2^attempts)::integer)) end,updated_at=now() where id=e.id;
 if p_result='REAUTH' then update rc_connections set status='REAUTH',last_error='REAUTH',updated_at=now() where id=c.id;
 elsif p_result='SYNCED' then update rc_connections set last_sync_at=now(),last_error=null where id=c.id;end if;
 return p_result;
end $$;
create or replace function reloo_rc_retention() returns integer language plpgsql security definer set search_path=public as $$
declare removed integer;
begin
 delete from rc_oauth_states where expires_at<now()-interval '1 day';get diagnostics removed=row_count;
 update rc_connections set status='DISCONNECTED',credentials_encrypted=null,version=version+1 where status='PENDING' and updated_at<now()-interval '1 day';
 return removed;
end $$;
do $$declare t text;f record;begin
 foreach t in array array['rc_preferences','rc_connections','rc_oauth_states','rc_rentals','rc_calendar_events','rc_audit'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated',t);execute format('grant all on %I to service_role',t);end loop;
 for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and (proname like 'rc\_%' escape '\' or proname like 'reloo_rc_%') loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);end loop;
end $$;
commit;
