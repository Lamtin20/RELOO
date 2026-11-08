begin;
alter table journey_events add column if not exists asset_id text;
alter table journey_events add column if not exists schema_version integer not null default 1;
alter table journey_events add column if not exists observed_at timestamptz;
alter table journey_events add column if not exists disposition text not null default 'accepted';
alter table journey_events add column if not exists exclusion_reason text;
alter table journey_events add column if not exists event_id uuid;
alter table journey_events add column if not exists event_data jsonb not null default '{}';
create unique index if not exists journey_event_id on journey_events(event_id);
create index if not exists journey_asset_window on journey_events(asset_id,observed_at) where schema_version=2;
create table if not exists analytics_sessions(
 session_hash text primary key,visitor_hash text not null,first_touch jsonb not null,session_touch jsonb not null,
 first_seen timestamptz not null default now(),last_seen timestamptz not null default now(),actor_hash text
);
create table if not exists analytics_seo_reviews(
 asset_id text primary key references assets(id),asset_version text not null,audit jsonb not null,assignee text references profiles(id),
 state text not null default 'OPEN' check(state in ('OPEN','REVIEW','RESOLVED')),updated_at timestamptz not null default now()
);
create table if not exists analytics_seo_history(id uuid primary key default gen_random_uuid(),asset_id text not null,actor_id text not null,action text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create table if not exists analytics_order_links(source text not null check(source in ('NEIGHBORHOOD','AGREEMENT')),order_id text not null,asset_id text not null,session_hash text not null,linked_at timestamptz not null default now(),primary key(source,order_id));
alter table analytics_order_links enable row level security;
alter table analytics_sessions enable row level security;
alter table analytics_seo_reviews enable row level security;
alter table analytics_seo_history enable row level security;
create or replace function reloo_product_event(p_event jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare sid text:=p_event->>'session_hash';v text:=p_event->>'visitor_hash';reason text:=p_event->>'exclusion_reason';touch jsonb:=p_event->'touch';
begin
 if (p_event->>'schema_version')::integer<>2 or p_event->>'event' not in ('ITEM_IMPRESSION','PRODUCT_CLICK','PRODUCT_VIEW','PHOTO_VIEW','TERMS_VIEW','DATES_SELECTED','SAVE_CLICK','SHARE_CLICK','SHARE_CONFIRMED','CHAT_OPEN','CALL_CLICK','INQUIRY_START','ENGAGED_TIME') then raise exception 'INVALID_EVENT';end if;
 if not exists(select 1 from assets where id=p_event->>'asset_id') then raise exception 'NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('analytics:'||sid,0));
 if exists(select 1 from journey_events where event_id=(p_event->>'event_id')::uuid) then return jsonb_build_object('result','DUPLICATE');end if;
 if exists(select 1 from analytics_sessions where session_hash=sid and (visitor_hash<>v or actor_hash is distinct from p_event->>'actor_hash')) then reason:='SESSION_SCOPE_MISMATCH';end if;
 if (select count(*) from journey_events where session_hash=sid and created_at>now()-interval '1 minute')>=120 then reason:='RATE_SPAM';end if;
 if p_event->>'event'='ITEM_IMPRESSION' and exists(select 1 from journey_events where session_hash=sid and asset_id=p_event->>'asset_id' and event='ITEM_IMPRESSION' and schema_version=2 and observed_at>now()-interval '30 minutes' and event_data->>'placement'=p_event->>'placement' and disposition='accepted') then reason:='REPEATED_IMPRESSION';end if;
 if reason is null then
  insert into analytics_sessions(session_hash,visitor_hash,first_touch,session_touch,actor_hash) values(sid,v,coalesce(p_event->'first_touch',touch),touch,p_event->>'actor_hash') on conflict(session_hash) do update set last_seen=now();
  select session_touch into touch from analytics_sessions where session_hash=sid;
 end if;
 insert into journey_events(event_id,visitor_hash,session_hash,event,path,asset_id,schema_version,observed_at,duration_ms,disposition,exclusion_reason,event_data)
 values((p_event->>'event_id')::uuid,v,sid,p_event->>'event',p_event->>'path',p_event->>'asset_id',2,(p_event->>'observed_at')::timestamptz,(p_event->>'duration_ms')::integer,case when reason is null then 'accepted' else 'excluded' end,reason,jsonb_build_object('placement',p_event->>'placement','device',p_event->>'device','touch',touch));
 return jsonb_build_object('result',case when reason is null then 'ACCEPTED' else 'EXCLUDED' end);
end $$;
create or replace function reloo_product_metrics(p_actor text,p_admin boolean,p_start timestamptz,p_end timestamptz,p_asset text default null,p_source text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;period interval:=p_end-p_start;
begin
 if p_actor is null or period<=interval '0' or period>interval '93 days' or p_end>now()+interval '2 days' then raise exception 'INVALID_REPORT';end if;
 if p_admin and not reloo_staff_permission(p_actor,'traffic.read') then raise exception 'FORBIDDEN';end if;
 if p_asset is not null and not exists(select 1 from assets where id=p_asset and (p_admin or owner_id=p_actor)) then raise exception 'NOT_FOUND';end if;
 with selected as(select a.id,a.title,a.status,a.category,a.images,a.updated_at from assets a where (p_admin or a.owner_id=p_actor) and (p_asset is null or a.id=p_asset) order by a.id limit 501),
 counts as(select a.id,
 count(*) filter(where e.disposition='accepted' and e.event='ITEM_IMPRESSION' and e.observed_at>=p_start) impressions,
 count(*) filter(where e.disposition='accepted' and e.event='PRODUCT_CLICK' and e.observed_at>=p_start) clicks,
 count(*) filter(where e.disposition='accepted' and e.event='PRODUCT_VIEW' and e.observed_at>=p_start) views,
 count(distinct e.visitor_hash) filter(where e.disposition='accepted' and e.event='PRODUCT_VIEW' and e.observed_at>=p_start) viewers,
 count(distinct e.session_hash) filter(where e.disposition='accepted' and e.observed_at>=p_start) sessions,
 count(*) filter(where e.disposition='accepted' and e.event='SAVE_CLICK' and e.observed_at>=p_start) saves,
 count(*) filter(where e.disposition='accepted' and e.event in ('CHAT_OPEN','CALL_CLICK') and e.observed_at>=p_start) contacts,
 coalesce(sum(e.duration_ms) filter(where e.disposition='accepted' and e.event='ENGAGED_TIME' and e.observed_at>=p_start),0) engaged_ms,
 count(*) filter(where e.disposition='excluded' and e.observed_at>=p_start) excluded,
 count(e.id) filter(where e.observed_at>=p_start) raw_events,
 count(*) filter(where e.disposition='accepted' and e.event='PRODUCT_VIEW' and e.observed_at<p_start) previous_views
 from selected a left join journey_events e on e.asset_id=a.id and e.schema_version=2 and e.observed_at>=p_start-period and e.observed_at<p_end and (p_source is null or e.event_data->'touch'->>'channel'=p_source) group by a.id)
 select coalesce(jsonb_agg(to_jsonb(a)||to_jsonb(c)-'id'),'[]') into result from selected a join counts c on c.id=a.id;
 return jsonb_build_object('rows',result,'capped',jsonb_array_length(result)>500,'from',p_start,'to',p_end,'attribution','session-first-external','minimumCohort',5,'schemaVersion',2);
end $$;
create or replace function reloo_seo_review(p_actor text,p_data jsonb) returns boolean language plpgsql security definer set search_path=public as $$declare prior jsonb;begin
 if not reloo_staff_permission(p_actor,'content.write') then raise exception 'FORBIDDEN';end if;
 select to_jsonb(r) into prior from analytics_seo_reviews r where asset_id=p_data->>'asset_id' for update;
 insert into analytics_seo_reviews(asset_id,asset_version,audit,assignee,state) values(p_data->>'asset_id',p_data->>'asset_version',p_data->'audit',p_actor,p_data->>'state') on conflict(asset_id) do update set asset_version=excluded.asset_version,audit=excluded.audit,assignee=excluded.assignee,state=excluded.state,updated_at=now();
 insert into analytics_seo_history(asset_id,actor_id,action,before_data,after_data) values(p_data->>'asset_id',p_actor,'REVIEW_UPDATED',prior,p_data);return true;
end $$;
create or replace function reloo_link_product_order(p_actor text,p_session text,p_source text,p_order text,p_actor_hash text) returns boolean language plpgsql security definer set search_path=public as $$declare aid text;begin
 if not exists(select 1 from analytics_sessions where session_hash=p_session and actor_hash=p_actor_hash and last_seen>now()-interval '30 minutes') then return false;end if;
 if p_source='NEIGHBORHOOD' and to_regclass('public.nk_orders') is not null then select asset_id into aid from nk_orders where id::text=p_order and renter_id=p_actor and status<>'DRAFT';
 elsif p_source='AGREEMENT' and to_regclass('public.rental_agreements') is not null then select listing_id into aid from rental_agreements where id::text=p_order and renter_id=p_actor;
 else return false;end if;
 if aid is null or not exists(select 1 from journey_events where asset_id=aid and session_hash=p_session and disposition='accepted' and event in ('PRODUCT_VIEW','INQUIRY_START') and observed_at>now()-interval '7 days') then return false;end if;
 insert into analytics_order_links(source,order_id,asset_id,session_hash) values(p_source,p_order,aid,p_session) on conflict do nothing;return true;
end $$;
create or replace function reloo_product_breakdown(p_actor text,p_admin boolean,p_asset text,p_start timestamptz,p_end timestamptz) returns jsonb language plpgsql security definer set search_path=public as $$declare daily jsonb;sources jsonb;placements jsonb;devices jsonb;linked integer;begin
 if p_end<=p_start or p_end-p_start>interval '93 days' then raise exception 'INVALID_REPORT';end if;
 if not exists(select 1 from assets where id=p_asset and (owner_id=p_actor or p_admin and reloo_staff_permission(p_actor,'traffic.read'))) then raise exception 'NOT_FOUND';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into daily from(select (observed_at at time zone 'Asia/Ho_Chi_Minh')::date as date_key,case when count(distinct visitor_hash)>=5 then count(*) filter(where event='PRODUCT_VIEW') else null end views,count(distinct visitor_hash)<5 suppressed from journey_events where asset_id=p_asset and schema_version=2 and disposition='accepted' and observed_at>=p_start and observed_at<p_end group by 1 order by 1)x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into sources from(select event_data->'touch'->>'channel' label,case when count(distinct visitor_hash)>=5 then count(*) else null end events,count(distinct visitor_hash)<5 suppressed from journey_events where asset_id=p_asset and schema_version=2 and disposition='accepted' and observed_at>=p_start and observed_at<p_end group by 1)x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into placements from(select event_data->>'placement' label,case when count(distinct visitor_hash)>=5 then count(*) else null end events,count(distinct visitor_hash)<5 suppressed from journey_events where asset_id=p_asset and schema_version=2 and disposition='accepted' and observed_at>=p_start and observed_at<p_end group by 1)x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into devices from(select event_data->>'device' label,case when count(distinct visitor_hash)>=5 then count(*) else null end events,count(distinct visitor_hash)<5 suppressed from journey_events where asset_id=p_asset and schema_version=2 and disposition='accepted' and observed_at>=p_start and observed_at<p_end group by 1)x;
 select count(*) into linked from analytics_order_links where asset_id=p_asset and linked_at>=p_start and linked_at<p_end;
 return jsonb_build_object('daily',daily,'sources',sources,'placements',placements,'devices',devices,'linkedOrders',linked,'conversionWindowDays',7,'region',null,'regionReason','No approved aggregate region signal collected');
end $$;
create or replace function reloo_analytics_retention() returns void language plpgsql security definer set search_path=public as $$begin
 delete from journey_events where schema_version=2 and created_at<now()-interval '90 days';
 delete from analytics_sessions where last_seen<now()-interval '90 days';
 delete from analytics_order_links where linked_at<now()-interval '90 days';
end $$;
revoke all on analytics_sessions,analytics_seo_reviews,analytics_seo_history,analytics_order_links from public,anon,authenticated;
revoke all on function reloo_seo_review(text,jsonb),reloo_link_product_order(text,text,text,text,text),reloo_product_breakdown(text,boolean,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function reloo_product_event(jsonb),reloo_product_metrics(text,boolean,timestamptz,timestamptz,text,text),reloo_analytics_retention() from public,anon,authenticated;
grant all on analytics_sessions,analytics_seo_reviews,analytics_seo_history,analytics_order_links to service_role;
grant execute on function reloo_seo_review(text,jsonb),reloo_link_product_order(text,text,text,text,text),reloo_product_breakdown(text,boolean,text,timestamptz,timestamptz) to service_role;
grant execute on function reloo_product_event(jsonb),reloo_product_metrics(text,boolean,timestamptz,timestamptz,text,text),reloo_analytics_retention() to service_role;
commit;
