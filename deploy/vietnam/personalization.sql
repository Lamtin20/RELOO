begin;
create table if not exists pp_preferences (
 profile_id text primary key references profiles(id),enabled boolean not null default false,epoch integer not null default 1,revision integer not null default 1,signal_revision integer not null default 0,
 categories text[] not null default '{}',consented_at timestamptz,reset_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists pp_events (
 profile_id text not null references profiles(id),event_id uuid not null,version integer not null default 1 check(version=1),epoch integer not null,
 kind text not null check(kind in ('SEARCH','VIEW','ENGAGED_VIEW','CATEGORY','FILTER','SAVE','START_RENT','COMPLETED','REVIEW','NEGATIVE')),
 asset_id text,category text not null,topic text check(topic in ('VACUUM','DRILL','CAMERA','CAMPING','LAPTOP','PROJECTOR','STROLLER','CLEANING')),occurred_at timestamptz not null,recorded_at timestamptz not null default now(),
 dedup_key text not null,server_generated boolean not null default false,primary key(profile_id,event_id),unique(profile_id,dedup_key)
);
create index if not exists pp_profile_events on pp_events(profile_id,recorded_at desc);
create table if not exists pp_exclusions (
 profile_id text not null references profiles(id),kind text not null check(kind in ('PRODUCT','CATEGORY','OWNER')),target text not null,created_at timestamptz not null default now(),primary key(profile_id,kind,target)
);
create table if not exists pp_configuration (
 singleton boolean primary key default true check(singleton),config jsonb not null
);
insert into pp_configuration values(true,'{"weights":{"SEARCH":1.4,"VIEW":0.2,"ENGAGED_VIEW":1.5,"CATEGORY":0.4,"FILTER":0.2,"SAVE":3,"START_RENT":4,"COMPLETED":5,"REVIEW":3,"NEGATIVE":-4},"halfLifeDays":7,"rawTtlDays":30,"profileTtlDays":30,"maxCategoryScore":12,"maxOwner":2,"maxCategory":3,"minimumConfidence":2}') on conflict do nothing;

create or replace function reloo_pp_preferences(p_actor text,p_enabled boolean,p_categories text[] default '{}',p_reset boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare pref pp_preferences;
begin
 perform pg_advisory_xact_lock(hashtextextended('pp:'||p_actor,0));
 if not exists(select 1 from profiles where id=p_actor and deleted_at is null) or cardinality(p_categories)>5 or exists(select 1 from unnest(p_categories) c where c!~'^[a-z0-9-]{2,60}$') then raise exception 'INVALID_INPUT';end if;
 select * into pref from pp_preferences where profile_id=p_actor for update;
 if p_reset or not p_enabled then delete from pp_events where profile_id=p_actor;end if;
 if p_reset then delete from pp_exclusions where profile_id=p_actor and kind<>'OWNER';end if;
 insert into pp_preferences(profile_id,enabled,epoch,categories,consented_at) values(p_actor,p_enabled,1,p_categories,case when p_enabled then now() end)
 on conflict(profile_id) do update set enabled=excluded.enabled,revision=pp_preferences.revision+1,epoch=pp_preferences.epoch+case when p_reset or not p_enabled or pp_preferences.enabled<>excluded.enabled then 1 else 0 end,
 categories=case when not p_enabled or p_reset then '{}' else excluded.categories end,consented_at=case when p_enabled then now() else null end,
 reset_at=case when p_reset or not p_enabled then now() else pp_preferences.reset_at end,updated_at=now()
 returning * into pref;return to_jsonb(pref);
end $$;

create or replace function reloo_pp_clear(p_actor text,p_all boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare pref pp_preferences;
begin
 perform pg_advisory_xact_lock(hashtextextended('pp:'||p_actor,0));
 delete from pp_events where profile_id=p_actor;
 if p_all then delete from pp_exclusions where profile_id=p_actor and kind<>'OWNER';end if;
 update pp_preferences set epoch=epoch+1,revision=revision+1,reset_at=now(),categories=case when p_all then '{}' else categories end,updated_at=now() where profile_id=p_actor returning * into pref;
 return to_jsonb(pref);
end $$;

create or replace function reloo_pp_record(p_actor text,p_event uuid,p_version integer,p_epoch integer,p_kind text,p_asset text,p_category text,p_at timestamptz,p_topic text default null) returns text language plpgsql security definer set search_path=public as $$
declare pref pp_preferences;cat text;target text;slot text;
begin
 perform pg_advisory_xact_lock(hashtextextended('pp:'||p_actor,0));
 select * into pref from pp_preferences where profile_id=p_actor;
 if not found or not pref.enabled or pref.epoch<>p_epoch then return 'NO_CONSENT';end if;
 if p_version<>1 or p_kind not in ('SEARCH','VIEW','ENGAGED_VIEW','CATEGORY','FILTER','SAVE','START_RENT','NEGATIVE') or p_at<now()-interval '10 minutes' or p_at>now()+interval '30 seconds' then raise exception 'INVALID_INPUT';end if;
 if exists(select 1 from pp_events where profile_id=p_actor and event_id=p_event) then return 'DUPLICATE';end if;
 if (select count(*) from pp_events where profile_id=p_actor and recorded_at>now()-interval '1 minute')>=60 then return 'RATE_LIMITED';end if;
 if nullif(p_asset,'') is not null then
 select category into cat from assets where id=p_asset and status='available' and not coalesce(is_locked,false);if not found then return 'INELIGIBLE';end if;
 else cat:=p_category;end if;
 if cat is null or cat!~'^[a-z0-9-]{2,60}$' then raise exception 'INVALID_INPUT';end if;
 target:=coalesce(nullif(p_asset,''),cat);slot:=floor(extract(epoch from now())/600)::bigint::text;
 if (select count(*) from pp_events where profile_id=p_actor and kind=p_kind and coalesce(asset_id,category)=target and recorded_at>=date_trunc('day',now()))>=3 then return 'CAPPED';end if;
 insert into pp_events(profile_id,event_id,epoch,kind,asset_id,category,topic,occurred_at,dedup_key)
 values(p_actor,p_event,p_epoch,p_kind,nullif(p_asset,''),cat,p_topic,p_at,p_epoch||':'||p_kind||':'||target||':'||coalesce(p_topic,'')||':'||slot) on conflict do nothing;
 if found then update pp_preferences set signal_revision=signal_revision+1 where profile_id=p_actor;return 'RECORDED';end if;return 'DUPLICATE';
end $$;

create or replace function reloo_pp_exclude(p_actor text,p_kind text,p_target text,p_enabled boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('pp:'||p_actor,0));
 if p_kind not in ('PRODUCT','CATEGORY','OWNER') or length(p_target) not between 1 and 150 then raise exception 'INVALID_INPUT';end if;
 if not exists(select 1 from profiles where id=p_actor and deleted_at is null) then raise exception 'FORBIDDEN';end if;
 if p_enabled then insert into pp_exclusions(profile_id,kind,target) values(p_actor,p_kind,p_target) on conflict do nothing;
 else delete from pp_exclusions where profile_id=p_actor and kind=p_kind and target=p_target;end if;
 insert into pp_preferences(profile_id,signal_revision) values(p_actor,1) on conflict(profile_id) do update set signal_revision=pp_preferences.signal_revision+1;
end $$;

create or replace function reloo_pp_context(p_actor text) returns jsonb language plpgsql security definer set search_path=public as $$
declare pref pp_preferences;cfg jsonb;
begin
 select * into pref from pp_preferences where profile_id=p_actor;select config into cfg from pp_configuration where singleton;
 return jsonb_build_object('enabled',coalesce(pref.enabled,false),'epoch',coalesce(pref.epoch,1),'revision',coalesce(pref.revision,1),'signalRevision',coalesce(pref.signal_revision,0),'categories',case when pref.enabled then pref.categories else '{}'::text[] end,
 'events',case when pref.enabled then coalesce((select jsonb_agg(to_jsonb(e)-'profile_id'-'dedup_key'-'event_id') from (select * from pp_events where profile_id=p_actor and epoch=pref.epoch and recorded_at>greatest(pref.reset_at,now()-make_interval(days=>(cfg->>'profileTtlDays')::integer)) order by recorded_at desc limit 1000) e),'[]') else '[]'::jsonb end,
 'exclusions',coalesce((select jsonb_agg(to_jsonb(x)-'profile_id'||jsonb_build_object('label',case when x.kind='OWNER' then (select name from profiles where id=x.target) when x.kind='PRODUCT' then (select title from assets where id=x.target) else null end)) from pp_exclusions x where profile_id=p_actor),'[]'),'config',cfg);
end $$;

create or replace function reloo_pp_candidates(p_actor text,p_ids text[],p_category text default null,p_province text default null,p_start timestamptz default null,p_end timestamptz default null) returns setof jsonb language plpgsql security definer set search_path=public as $$
begin
 if cardinality(p_ids)>300 or (p_start is null)<>(p_end is null) or (p_start is not null and (p_start<now()-interval '5 minutes' or p_end<=p_start or p_end>p_start+interval '90 days')) then raise exception 'INVALID_INPUT';end if;
 return query select jsonb_build_object('id',a.id,'title',a.title,'category',a.category,'images',a.images,'dailyPrice',a.daily_price,'ownerId',a.owner_id,
 'location',coalesce(a.location_details->'province'->>'name',''),'deposit',a.listing_data->'deposit','createdAt',a.created_at,'isBoosted',coalesce(a.is_boosted,false),'transactionMode',coalesce(a.listing_data->>'transactionMode','RENT'),'salePrice',case when a.listing_data->>'salePrice'~'^[0-9]{1,12}$' then (a.listing_data->>'salePrice')::bigint else null end)
 from assets a join profiles owner on owner.id=a.owner_id
 where a.status='available' and not coalesce(a.is_locked,false) and upper(coalesce(a.dispute_status,'')) not in ('OPEN','DISPUTED','ACTIVE','PENDING')
 and owner.deleted_at is null and owner.activation_status='ACTIVE' and (a.daily_price>0 or (a.listing_data->>'transactionMode'='SALE' and case when a.listing_data->>'salePrice'~'^[0-9]{1,12}$' then (a.listing_data->>'salePrice')::bigint>0 else false end))
 and coalesce(a.listing_data->>'neighborhoodOnly','false')<>'true'
 and (coalesce(cardinality(p_ids),0)=0 or a.id=any(p_ids))
 and (p_category is null or a.category=p_category) and (p_province is null or coalesce(a.location_details->'province'->>'code',a.location_details->>'provinceCode')=p_province)
 and not exists(select 1 from pp_exclusions x where x.profile_id=p_actor and ((x.kind='PRODUCT' and x.target=a.id) or (x.kind='CATEGORY' and x.target=a.category) or (x.kind='OWNER' and x.target=a.owner_id)))
 and (p_start is null or nk_calendar_free(a.id,p_start,p_end,0))
 order by a.created_at desc limit 300;
end $$;

create or replace function pp_capture_completed() returns trigger language plpgsql set search_path=public as $$
declare r jsonb:=to_jsonb(new);actor text;asset text;event text;pref pp_preferences;cat text;
begin
 if tg_table_name='rc_rentals' then if tg_op='INSERT' or new.state<>'RETURNED' or (tg_op='UPDATE' and old.state='RETURNED') then return new;end if;actor:=new.profile_id;asset:=new.asset_id;event:='COMPLETED';
 elsif tg_table_name='nk_reviews' then select renter_id,asset_id into actor,asset from nk_orders where id=new.order_id and status='COMPLETED' and renter_id=new.profile_id;event:='REVIEW';end if;
 if actor is null or not exists(select 1 from profiles where id=actor and deleted_at is null) then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('pp:'||actor,0));select * into pref from pp_preferences where profile_id=actor and enabled;
 if not found then return new;end if;
 if tg_table_name='nk_reviews' then if new.created_at<greatest(pref.reset_at,pref.consented_at) then return new;end if;
 elsif tg_table_name='rc_rentals' then if new.updated_at<greatest(pref.reset_at,pref.consented_at) then return new;end if;end if;
 select category into cat from assets where id=asset;
 if cat is not null then insert into pp_events(profile_id,event_id,epoch,kind,asset_id,category,occurred_at,dedup_key,server_generated)
 values(actor,gen_random_uuid(),pref.epoch,event,asset,cat,now(),pref.epoch||':'||event||':'||coalesce(r->>'rental_id',r->>'order_id'),true) on conflict do nothing;
 if found then update pp_preferences set signal_revision=signal_revision+1 where profile_id=actor;end if;end if;return new;
end $$;
drop trigger if exists pp_completed on rc_rentals;
create trigger pp_completed after insert or update on rc_rentals for each row execute function pp_capture_completed();
drop trigger if exists pp_review on nk_reviews;
create trigger pp_review after insert on nk_reviews for each row execute function pp_capture_completed();
create or replace function reloo_pp_retention() returns integer language plpgsql security definer set search_path=public as $$
declare removed integer;days integer;
begin
 select least(90,greatest(1,(config->>'rawTtlDays')::integer)) into days from pp_configuration where singleton;
 delete from pp_events where recorded_at<now()-make_interval(days=>days);get diagnostics removed=row_count;
 delete from pp_exclusions where kind<>'OWNER' and created_at<now()-interval '90 days';
 delete from rc_oauth_states where expires_at<now()-interval '1 day';return removed;
end $$;
create or replace function pp_account_deleted() returns trigger language plpgsql set search_path=public as $$
begin
 if new.deleted_at is not null and old.deleted_at is null then
 update pp_preferences set enabled=false,epoch=epoch+1,categories='{}',consented_at=null,reset_at=now() where profile_id=new.id;
 delete from pp_events where profile_id=new.id;delete from pp_exclusions where profile_id=new.id;
 update rc_connections set status='DISCONNECTED',credentials_encrypted=null,email=null,google_subject=null,registered_email=null,calendar_name=null,version=version+1 where profile_id=new.id;
 delete from rc_oauth_states where profile_id=new.id;
 end if;return new;
end $$;
drop trigger if exists pp_account_privacy on profiles;
create trigger pp_account_privacy after update of deleted_at on profiles for each row execute function pp_account_deleted();
do $$declare t text;f record;begin
 foreach t in array array['pp_preferences','pp_events','pp_exclusions','pp_configuration'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated',t);execute format('grant all on %I to service_role',t);end loop;
 for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and (proname like 'pp\_%' escape '\' or proname like 'reloo_pp_%') loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);end loop;
end $$;
commit;
