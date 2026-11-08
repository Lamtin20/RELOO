alter table short_video_media add column if not exists hls_ready boolean not null default false;
alter table short_video_media add column if not exists poster_filename text;
alter table short_video_media add column if not exists stream_version integer not null default 1;
alter table short_video_media add column if not exists stream_bytes bigint;
create index if not exists short_feed_order on short_videos(status,created_at desc,id desc);
create index if not exists short_owner_order on short_videos(profile_id,created_at desc,id desc);
create or replace function reloo_public_short_access(p_video uuid,p_viewer text default null) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from short_videos v join profiles p on p.id=v.profile_id join short_video_media m on m.id=v.media_id where v.id=p_video and v.status='PUBLISHED' and m.status='READY' and p.status='active' and p.activation_status='ACTIVE' and p.screening_valid_until>now() and p.deleted_at is null and not exists(select 1 from verified_identities i where i.profile_id=p.id and i.expires_at<=now()) and not exists(select 1 from short_video_blocks b where b.profile_id=p_viewer and b.blocked_profile_id=p.id));
$$;
create or replace function reloo_create_short(p_profile text,p_media uuid,p_caption text,p_products jsonb,p_draft boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare vid uuid;tag jsonb;asset assets;n integer:=0;seen text[]:='{}';prior short_videos;expected_ids text[];
begin
 perform reloo_assert_active(p_profile);
 if not exists(select 1 from short_video_media where id=p_media and profile_id=p_profile and status in ('READY','PROCESSING')) or length(trim(p_caption)) not between 1 and 1200 or jsonb_typeof(p_products) is distinct from 'array' or jsonb_array_length(p_products)>5 then raise exception 'SHORT_INPUT_REQUIRED';end if;
 if exists(select 1 from jsonb_array_elements(p_products) t where t->>'kind' is distinct from 'RENTAL') then raise exception 'SHORT_EXTERNAL_DISABLED';end if;
 perform 1 from short_video_media where id=p_media for update;
 select * into prior from short_videos where media_id=p_media;
 if found then
  expected_ids:=array(select t->>'assetId' from jsonb_array_elements(p_products) t);
  if prior.profile_id=p_profile and prior.caption=trim(p_caption) and prior.status=(case when p_draft then 'DRAFT' else 'PENDING' end) and expected_ids=array(select asset_id from short_video_products where video_id=prior.id order by position) then return prior.id;end if;
  raise exception 'SHORT_MEDIA_ALREADY_USED';
 end if;
 insert into short_videos(profile_id,media_id,caption,status) values(p_profile,p_media,trim(p_caption),case when p_draft then 'DRAFT' else 'PENDING' end) returning id into vid;
 for tag in select * from jsonb_array_elements(p_products) loop
  if tag->>'kind'<>'RENTAL' or tag->>'kind' is null then raise exception 'SHORT_EXTERNAL_DISABLED';end if;
  if tag->>'assetId'=any(seen) then raise exception 'DUPLICATE_PRODUCT';end if;
  select * into asset from assets where id=tag->>'assetId' and owner_id=p_profile and status='available' and not is_locked;if not found then raise exception 'OWNED_AVAILABLE_PRODUCT_REQUIRED';end if;
  insert into short_video_products(video_id,kind,asset_id,title,href,position) values(vid,'RENTAL',asset.id,asset.title,'/product/'||asset.id,n);
  n:=n+1;seen:=seen||asset.id;
 end loop;return vid;
end $$;
create or replace function reloo_short_ready_to_publish() returns trigger language plpgsql set search_path=public as $$
begin if new.status='PUBLISHED' and old.status<>'PUBLISHED' and not exists(select 1 from short_video_media where id=new.media_id and status='READY') then raise exception 'SHORT_MEDIA_NOT_READY';end if;return new;end $$;
drop trigger if exists short_publish_ready on short_videos;
create trigger short_publish_ready before update on short_videos for each row execute function reloo_short_ready_to_publish();
create table if not exists short_metric_events (
 video_id uuid not null references short_videos(id),visit_nonce uuid not null,kind text not null check(kind in ('IMPRESSION','VIEW','PRODUCT_IMPRESSION','OPEN','CLICK','CLICK_VISIT')),product_key text not null default '',created_at timestamptz not null default now(),primary key(video_id,visit_nonce,kind,product_key)
);
create table if not exists short_daily_metrics (
 video_id uuid not null references short_videos(id),day date not null,impressions bigint not null default 0,views bigint not null default 0,product_impressions bigint not null default 0,opens bigint not null default 0,clicks bigint not null default 0,clicked_visits bigint not null default 0,primary key(video_id,day)
);
create index if not exists short_event_retention on short_metric_events(created_at);
create or replace function reloo_prune_short_events() returns void language sql security definer set search_path=public as $$ delete from short_metric_events where created_at<now()-interval '3 hours' $$;
do $$declare t text;begin foreach t in array array['short_metric_events','short_daily_metrics'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public,anon,authenticated',t);execute format('grant all on %I to service_role',t);end loop;end $$;
create or replace function reloo_count_short_event(p_video uuid,p_nonce uuid,p_kind text,p_product uuid default null) returns boolean language plpgsql security definer set search_path=public as $$
declare inserted boolean;delta text;today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 if p_kind not in ('IMPRESSION','VIEW','PRODUCT_IMPRESSION','OPEN','CLICK') then raise exception 'SHORT_EVENT_INVALID';end if;
 if not reloo_public_short_access(p_video,null) then return false;end if;
 perform pg_advisory_xact_lock(hashtext('short-event:'||p_nonce));
 if p_kind<>'IMPRESSION' and not exists(select 1 from short_metric_events where video_id=p_video and visit_nonce=p_nonce and kind='IMPRESSION') then raise exception 'IMPRESSION_REQUIRED';end if;
 if p_kind='CLICK' and not exists(select 1 from short_video_products where id=p_product and video_id=p_video and kind='RENTAL') then raise exception 'PRODUCT_REQUIRED';end if;
 if p_kind='CLICK' and not exists(select 1 from short_metric_events where video_id=p_video and visit_nonce=p_nonce and kind='PRODUCT_IMPRESSION') then raise exception 'PRODUCT_IMPRESSION_REQUIRED';end if;
 if p_kind in ('PRODUCT_IMPRESSION','OPEN') and not exists(select 1 from short_video_products where video_id=p_video and kind='RENTAL') then return false;end if;
 insert into short_metric_events(video_id,visit_nonce,kind,product_key) values(p_video,p_nonce,p_kind,case when p_kind='CLICK' then p_product::text else '' end) on conflict do nothing;
 inserted:=found;if not inserted then return false;end if;
 insert into short_daily_metrics(video_id,day) values(p_video,today) on conflict do nothing;
 update short_daily_metrics set impressions=impressions+case when p_kind='IMPRESSION' then 1 else 0 end,views=views+case when p_kind='VIEW' then 1 else 0 end,product_impressions=product_impressions+case when p_kind='PRODUCT_IMPRESSION' then 1 else 0 end,opens=opens+case when p_kind='OPEN' then 1 else 0 end,clicks=clicks+case when p_kind='CLICK' then 1 else 0 end where video_id=p_video and day=today;
 if p_kind='CLICK' then
  insert into short_metric_events(video_id,visit_nonce,kind) values(p_video,p_nonce,'CLICK_VISIT') on conflict do nothing;
  if found then update short_daily_metrics set clicked_visits=clicked_visits+1 where video_id=p_video and day=today;end if;
 end if;return true;
end $$;
create or replace function reloo_short_insights(p_profile text,p_days integer default 30) returns jsonb language sql stable security definer set search_path=public as $$
with stats as(select m.* from short_daily_metrics m join short_videos v on v.id=m.video_id where v.profile_id=p_profile and m.day>=(now() at time zone 'Asia/Ho_Chi_Minh')::date-least(greatest(p_days,1),90)+1),daily as(select day,sum(views)::text views,sum(impressions)::text impressions,sum(product_impressions)::text product_impressions,sum(opens)::text opens,sum(clicks)::text clicks,sum(clicked_visits)::text clicked_visits from stats group by day order by day),videos as(select video_id,sum(views)::text views,sum(impressions)::text impressions,sum(product_impressions)::text product_impressions,sum(opens)::text opens,sum(clicks)::text clicks,sum(clicked_visits)::text clicked_visits from stats group by video_id)
select jsonb_build_object('totals',jsonb_build_object('views',coalesce(sum(views),0)::text,'impressions',coalesce(sum(impressions),0)::text,'product_impressions',coalesce(sum(product_impressions),0)::text,'opens',coalesce(sum(opens),0)::text,'clicks',coalesce(sum(clicks),0)::text,'clicked_visits',coalesce(sum(clicked_visits),0)::text),'daily',coalesce((select jsonb_agg(to_jsonb(daily)) from daily),'[]'),'videos',coalesce((select jsonb_agg(to_jsonb(videos)) from videos),'[]')) from stats;
$$;
revoke all on function reloo_public_short_access(uuid,text),reloo_count_short_event(uuid,uuid,text,uuid),reloo_short_insights(text,integer),reloo_prune_short_events() from public,anon,authenticated;
grant execute on function reloo_public_short_access(uuid,text),reloo_count_short_event(uuid,uuid,text,uuid),reloo_short_insights(text,integer),reloo_prune_short_events() to service_role;
notify pgrst,'reload schema';
