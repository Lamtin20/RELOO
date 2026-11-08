create table if not exists short_video_media(id uuid primary key,profile_id text not null references profiles(id),filename text not null unique check(filename~'^[a-f0-9-]{36}\.mp4$'),duration numeric not null check(duration between 2 and 180),width integer not null,height integer not null,bytes bigint not null check(bytes>0 and bytes<=41943040),created_at timestamptz not null default now());
create table if not exists short_videos(id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),media_id uuid not null unique references short_video_media(id),caption text not null check(length(caption) between 1 and 1200),status text not null default 'PENDING' check(status in ('DRAFT','PENDING','PUBLISHED','REJECTED','ARCHIVED')),version integer not null default 1,reviewed_by text references profiles(id),review_reason text,created_at timestamptz not null default now(),published_at timestamptz,updated_at timestamptz not null default now());
create table if not exists short_video_products(id uuid primary key default gen_random_uuid(),video_id uuid not null references short_videos(id),kind text not null check(kind in ('RENTAL','EXTERNAL')),asset_id text references assets(id),title text not null,href text not null,position integer not null check(position between 0 and 4),check((kind='RENTAL' and asset_id is not null) or (kind='EXTERNAL' and asset_id is null)),unique(video_id,position));
create table if not exists short_video_reports(id uuid primary key default gen_random_uuid(),video_id uuid not null references short_videos(id),profile_id text not null references profiles(id),reason text not null check(length(reason) between 10 and 2000),created_at timestamptz default now(),unique(video_id,profile_id));
create table if not exists short_video_blocks(profile_id text not null references profiles(id),blocked_profile_id text not null references profiles(id),created_at timestamptz default now(),primary key(profile_id,blocked_profile_id),check(profile_id<>blocked_profile_id));
create index if not exists short_video_feed on short_videos(status,published_at desc);
alter table short_video_media add column if not exists status text not null default 'PROCESSING' check(status in ('PROCESSING','READY','FAILED'));
create or replace function reloo_short_upload_quota() returns trigger language plpgsql security definer set search_path=public as $$begin perform pg_advisory_xact_lock(hashtext('short-upload:'||new.profile_id));perform reloo_assert_active(new.profile_id);if (select count(*) from short_video_media where profile_id=new.profile_id and created_at>now()-interval '24 hours')>=8 then raise exception 'SHORT_DAILY_LIMIT';end if;return new;end$$;
drop trigger if exists short_upload_quota on short_video_media;
create trigger short_upload_quota before insert on short_video_media for each row execute function reloo_short_upload_quota();
do $$declare t text;begin foreach t in array array['short_video_media','short_videos','short_video_products','short_video_reports','short_video_blocks'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from anon,authenticated',t);execute format('grant all on %I to service_role',t);end loop;end$$;
create or replace function reloo_create_short(p_profile text,p_media uuid,p_caption text,p_products jsonb,p_draft boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare vid uuid;tag jsonb;asset assets;n integer:=0;
begin
 perform reloo_assert_active(p_profile);
 if not exists(select 1 from short_video_media where id=p_media and profile_id=p_profile and status='READY') or length(trim(p_caption)) not between 1 and 1200 or jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products) not between 1 and 5 then raise exception 'SHORT_INPUT_REQUIRED';end if;
 insert into short_videos(profile_id,media_id,caption,status) values(p_profile,p_media,trim(p_caption),case when p_draft then 'DRAFT' else 'PENDING' end) returning id into vid;
 for tag in select * from jsonb_array_elements(p_products) loop
  if tag->>'kind'='RENTAL' then
   select * into asset from assets where id=tag->>'assetId' and owner_id=p_profile and status='available' and not is_locked;if not found then raise exception 'OWNED_AVAILABLE_PRODUCT_REQUIRED';end if;
   insert into short_video_products(video_id,kind,asset_id,title,href,position) values(vid,'RENTAL',asset.id,asset.title,'/product/'||asset.id,n);
  elsif tag->>'kind'='EXTERNAL' and length(trim(tag->>'title')) between 3 and 160 and tag->>'href'~'^https://(www\.)?(shopee\.vn|s\.shopee\.vn|shope\.ee|tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|shop\.tiktok\.com)/' and length(tag->>'href')<=2000 then
   insert into short_video_products(video_id,kind,title,href,position) values(vid,'EXTERNAL',trim(tag->>'title'),tag->>'href',n);
  else raise exception 'INVALID_PRODUCT_LINK';end if;n:=n+1;
 end loop;
 return vid;
end $$;
create or replace function reloo_update_short(p_profile text,p_id uuid,p_action text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_action='ARCHIVE' then update short_videos set status='ARCHIVED',version=version+1,updated_at=now() where id=p_id and profile_id=p_profile;
 elsif p_action='SUBMIT' then perform reloo_assert_active(p_profile);update short_videos set status='PENDING',version=version+1,updated_at=now() where id=p_id and profile_id=p_profile and status='DRAFT';else raise exception 'INVALID_SHORT_ACTION';end if;
 if not found then raise exception 'OWNED_VIDEO_REQUIRED';end if;
end $$;
create or replace function reloo_review_short(p_actor text,p_id uuid,p_version integer,p_publish boolean,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare item short_videos;
begin
 if not reloo_staff_permission(p_actor,'content.write') then raise exception 'PERMISSION_REQUIRED';end if;
 select * into item from short_videos where id=p_id and version=p_version and (status='PENDING' or (status='PUBLISHED' and not p_publish)) for update;if not found then raise exception 'SHORT_VERSION_CHANGED';end if;
 if length(trim(p_reason)) not between 10 and 2000 then raise exception 'REVIEW_REASON_REQUIRED';end if;
 if p_publish then perform reloo_assert_active(item.profile_id);end if;
 update short_videos set status=case when p_publish then 'PUBLISHED' when item.status='PUBLISHED' then 'ARCHIVED' else 'REJECTED' end,version=version+1,reviewed_by=p_actor,review_reason=p_reason,published_at=case when p_publish then now() else published_at end,updated_at=now() where id=p_id;
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.profile_id,'SHORT_REVIEWED',jsonb_build_object('videoId',p_id,'published',p_publish,'reason',p_reason));
end $$;
revoke all on function reloo_create_short(text,uuid,text,jsonb,boolean),reloo_update_short(text,uuid,text),reloo_review_short(text,uuid,integer,boolean,text) from public,anon,authenticated;
grant execute on function reloo_create_short(text,uuid,text,jsonb,boolean),reloo_update_short(text,uuid,text),reloo_review_short(text,uuid,integer,boolean,text) to service_role;
notify pgrst,'reload schema';
