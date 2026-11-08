-- Media is decoded and packaged by the bounded background worker, never by the feed request.
alter table short_video_media drop constraint if exists short_video_media_bytes_check;
alter table short_video_media add constraint short_video_media_bytes_check check(bytes>0 and bytes<=209715200);
alter table short_video_media add column if not exists source_filename text check(source_filename ~ '^[a-f0-9-]{36}\.source$');
alter table short_video_media add column if not exists source_bytes bigint check(source_bytes>0 and source_bytes<=83886080);
alter table short_videos add column if not exists review_mode text not null default 'AUTO' check(review_mode in ('AUTO','MANUAL'));
alter table short_videos add column if not exists auto_rule_codes text[] not null default '{}';
alter table short_videos add column if not exists auto_checked_at timestamptz;

create or replace function reloo_auto_publish_short(p_id uuid) returns text language plpgsql security definer set search_path=public as $$
declare item short_videos;media short_video_media;codes text[]:='{}';reason text;
begin
 select * into item from short_videos where id=p_id for update;
 if not found then return 'MISSING';end if;
 if item.status<>'PENDING' or item.review_mode<>'AUTO' then return item.status;end if;
 select * into media from short_video_media where id=item.media_id;
 if media.status='FAILED' then codes:=array_append(codes,'MEDIA_FAILED');
 elsif media.status<>'READY' or not media.hls_ready then codes:=array_append(codes,'MEDIA_PROCESSING');end if;
 begin
  perform reloo_assert_active(item.profile_id);
 exception when sqlstate '42501' or raise_exception then
  if sqlerrm in ('ACCOUNT_RESTRICTED','IDENTITY_EXPIRED') then codes:=codes||sqlerrm;else raise;end if;
 end;
 if exists(select 1 from profiles where id=item.profile_id and deleted_at is not null) then codes:=array_append(codes,'ACCOUNT_DELETED');end if;
 if exists(select 1 from verified_identities where profile_id=item.profile_id and expires_at<=now()) then codes:=array_append(codes,'IDENTITY_EXPIRED');end if;
 if exists(select 1 from short_video_products t left join assets a on a.id=t.asset_id where t.video_id=item.id and (t.kind<>'RENTAL' or a.id is null or a.owner_id<>item.profile_id or a.status<>'available' or a.is_locked)) then codes:=array_append(codes,'PRODUCT_UNAVAILABLE');end if;
 if length(trim(item.caption)) not between 1 and 1200 then codes:=array_append(codes,'CAPTION_INVALID');end if;
 if cardinality(codes)>0 then
  reason:=case when 'MEDIA_FAILED'=any(codes) then 'Video chưa xử lý được. Hãy tải lại file gốc.' when 'ACCOUNT_RESTRICTED'=any(codes) or 'IDENTITY_EXPIRED'=any(codes) or 'ACCOUNT_DELETED'=any(codes) then 'Tài khoản chưa đủ điều kiện hiển thị. Kiểm tra Hồ sơ an toàn và căn cước.' when 'PRODUCT_UNAVAILABLE'=any(codes) then 'Sản phẩm gắn vào video chưa khả dụng hoặc đang bị hạn chế.' else 'Đang xử lý video và kiểm tra điều kiện hiển thị.' end;
  update short_videos set auto_rule_codes=codes,auto_checked_at=now(),review_reason=reason,status=case when 'MEDIA_FAILED'=any(codes) then 'REJECTED' else 'PENDING' end,updated_at=now() where id=item.id;
  return 'BLOCKED';
 end if;
 update short_videos set status='PUBLISHED',version=version+1,auto_rule_codes='{}',auto_checked_at=now(),review_reason=null,reviewed_by=null,published_at=coalesce(published_at,now()),updated_at=now() where id=item.id;
 insert into security_audit(actor_id,subject_id,action,details) values(null,item.profile_id,'SHORT_AUTO_PUBLISHED',jsonb_build_object('videoId',item.id,'ruleVersion',1,'mediaVersion',media.stream_version));
 return 'PUBLISHED';
end$$;

create or replace function reloo_short_auto_media() returns trigger language plpgsql security definer set search_path=public as $$
declare item record;begin
 for item in select id from short_videos where media_id=new.id and status='PENDING' and review_mode='AUTO' loop perform reloo_auto_publish_short(item.id);end loop;return new;
end$$;
drop trigger if exists short_auto_media on short_video_media;
create trigger short_auto_media after update of status,hls_ready,stream_version on short_video_media for each row when(new.status in ('READY','FAILED')) execute function reloo_short_auto_media();

create or replace function reloo_short_auto_submit() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status='PENDING' and old.status='DRAFT' and new.review_mode='AUTO' then perform reloo_auto_publish_short(new.id);end if;return new;end$$;
drop trigger if exists short_auto_submit on short_videos;
create trigger short_auto_submit after update of status on short_videos for each row execute function reloo_short_auto_submit();

create or replace function reloo_create_short(p_profile text,p_media uuid,p_caption text,p_products jsonb,p_draft boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare vid uuid;tag jsonb;asset assets;n integer:=0;seen text[]:='{}';prior short_videos;expected_ids text[];
begin
 perform reloo_assert_active(p_profile);
 perform 1 from short_video_media where id=p_media and profile_id=p_profile and status in ('READY','PROCESSING') for update;
 if not found or length(trim(p_caption)) not between 1 and 1200 or jsonb_typeof(p_products) is distinct from 'array' or jsonb_array_length(p_products)>5 then raise exception 'SHORT_INPUT_REQUIRED';end if;
 if exists(select 1 from jsonb_array_elements(p_products) t where t->>'kind' is distinct from 'RENTAL') then raise exception 'SHORT_EXTERNAL_DISABLED';end if;
 select * into prior from short_videos where media_id=p_media;
 if found then
  expected_ids:=array(select t->>'assetId' from jsonb_array_elements(p_products) t);
  if prior.profile_id=p_profile and prior.caption=trim(p_caption) and ((p_draft and prior.status='DRAFT') or (not p_draft and prior.status in ('PENDING','PUBLISHED') and prior.review_mode='AUTO')) and expected_ids=array(select asset_id from short_video_products where video_id=prior.id order by position) then return prior.id;end if;
  raise exception 'SHORT_MEDIA_ALREADY_USED';
 end if;
 insert into short_videos(profile_id,media_id,caption,status,review_mode) values(p_profile,p_media,trim(p_caption),case when p_draft then 'DRAFT' else 'PENDING' end,'AUTO') returning id into vid;
 for tag in select * from jsonb_array_elements(p_products) loop
  if tag->>'assetId'=any(seen) then raise exception 'DUPLICATE_PRODUCT';end if;
  select * into asset from assets where id=tag->>'assetId' and owner_id=p_profile and status='available' and not is_locked;if not found then raise exception 'OWNED_AVAILABLE_PRODUCT_REQUIRED';end if;
  insert into short_video_products(video_id,kind,asset_id,title,href,position) values(vid,'RENTAL',asset.id,asset.title,'/product/'||asset.id,n);
  n:=n+1;seen:=seen||asset.id;
 end loop;
 if not p_draft then perform reloo_auto_publish_short(vid);end if;return vid;
end$$;

create or replace function reloo_recheck_pending_shorts() returns integer language plpgsql security definer set search_path=public as $$
declare item record;counted integer:=0;begin
 for item in select v.id from short_videos v join short_video_media m on m.id=v.media_id where v.status='PENDING' and v.review_mode='AUTO' and m.status in ('READY','FAILED') and (v.auto_checked_at is null or v.auto_checked_at<now()-interval '1 minute') order by v.created_at for update of v skip locked limit 20 loop perform reloo_auto_publish_short(item.id);counted:=counted+1;end loop;
 return counted;
end$$;
revoke all on function reloo_auto_publish_short(uuid),reloo_short_auto_media(),reloo_short_auto_submit(),reloo_recheck_pending_shorts() from public,anon,authenticated;
grant execute on function reloo_auto_publish_short(uuid),reloo_recheck_pending_shorts() to service_role;
notify pgrst,'reload schema';
