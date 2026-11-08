begin;
create or replace function reloo_neighborhood_read(p_actor text,p_section text,p_filter jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;v_area uuid;v_start timestamptz;v_end timestamptz;o nk_orders;v_building uuid;v_subzone uuid;
begin
 if p_section='catalog' then
 return jsonb_build_object('places',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'kind',p.kind,'parent_id',p.parent_id,'name',p.name,'aliases',p.aliases,'address',p.address_normalized,'administrative',p.administrative,'geometry',p.geometry,'source_id',p.source_id,'confidence',p.confidence,'verification',p.verification,'enabled',p.enabled,'version',p.version,'updated_at',p.updated_at) order by p.kind,p.name) from nk_places p where p.status='ACTIVE' and p.kind<>'HANDOVER' and p.merged_into is null),'[]'::jsonb),'sources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'terms',terms,'attribution',attribution,'last_success',last_success)) from nk_sources),'[]'::jsonb));
 end if;
 if p_section in ('search','quote','needs','promotions') then
 v_area:=nullif(p_filter->>'area','')::uuid;
 if not exists(select 1 from nk_places where id=v_area and kind='AREA' and enabled and status='ACTIVE') then return jsonb_build_object('items','[]'::jsonb,'needs','[]'::jsonb,'disabled',true);end if;
 if p_section='promotions' then return jsonb_build_object('promotions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'terms',terms,'amount',amount,'expires_at',expires_at)) from nk_promotions promo where area_id=v_area and enabled and expires_at>now() and used<budget and exists(select 1 from nk_policies pol where pol.area_id=v_area and pol.version=(select max(version) from nk_policies where area_id=v_area) and pol.fee_bps>0) and p_actor is not null and (not verified_only or nk_is_verified(p_actor,v_area)) and not exists(select 1 from nk_promotion_claims where promotion_id=promo.id and profile_id=p_actor)),'[]'::jsonb));end if;
 if p_section='quote' then
 if not nk_eligible(p_actor,p_filter->>'asset') then raise exception 'RESIDENCY_REQUIRED';end if;
 if not exists(select 1 from nk_listings l join assets a on a.id=l.asset_id where l.asset_id=p_filter->>'asset' and l.area_id=v_area and l.status='ACTIVE' and a.owner_id=l.owner_id and nk_asset_usable(a.id) and not coalesce(a.is_locked,false) and upper(coalesce(a.dispute_status,'')) not in ('OPEN','DISPUTED','ACTIVE','PENDING')) then raise exception 'NOT_FOUND';end if;
 v_start:=(p_filter->>'start')::timestamptz;v_end:=(p_filter->>'end')::timestamptz;
 if not nk_calendar_free(p_filter->>'asset',v_start,v_end,(select buffer_minutes from nk_listings where asset_id=p_filter->>'asset')) then raise exception 'SLOT_CONFLICT';end if;
 return jsonb_build_object('quote',nk_promotion_quote(p_actor,v_area,nullif(p_filter->>'promotion','')::uuid,nk_quote(p_filter->>'asset',v_start,v_end)));end if;
 if p_section='needs' then
 return jsonb_build_object('needs',coalesce((select jsonb_agg(x) from(select n.id,n.title,n.category,n.starts_at,n.ends_at,n.budget,n.scope,n.building_id,n.subzone_id,n.note,n.images,n.expires_at,(n.profile_id=p_actor) mine,(select count(*) from nk_offers f where f.need_id=n.id) offer_count from nk_needs n where n.area_id=v_area and n.status='OPEN' and n.expires_at>now() and (n.scope='AREA' or exists(select 1 from nk_memberships m join nk_places b on b.id=m.building_id where m.profile_id=p_actor and m.area_id=v_area and (n.scope='BUILDING' and m.building_id=n.building_id or n.scope='SUBZONE' and b.parent_id=n.subzone_id))) order by n.created_at desc limit 100)x),'[]'::jsonb));end if;
 v_start:=nullif(p_filter->>'start','')::timestamptz;v_end:=nullif(p_filter->>'end','')::timestamptz;
 v_building:=coalesce(nullif(p_filter->>'building','')::uuid,(select building_id from nk_memberships where profile_id=p_actor and area_id=v_area and status not in ('REVOKED','REJECTED') limit 1));
 v_subzone:=coalesce(nullif(p_filter->>'subzone','')::uuid,(select parent_id from nk_places where id=v_building and kind='BUILDING'));
 return jsonb_build_object('items',coalesce((select jsonb_agg(x order by rank,match_score desc,rating desc nulls last,estimated_total,title) from(
 select l.asset_id,l.owner_id,l.area_id,l.subzone_id,l.building_id,l.scope,l.rate,l.unit_minutes,l.deposit,l.min_minutes,l.buffer_minutes,l.verified_only,l.instant,l.version,l.accessories,l.condition,l.instructions,
 a.title,a.category,a.images,a.description,
 nk_is_verified(l.owner_id,l.area_id) owner_verified,
 (select round(avg(r.rating),1) from nk_reviews r join nk_orders ro on ro.id=r.order_id where ro.asset_id=l.asset_id and r.profile_id=ro.renter_id and ro.status='COMPLETED') rating,
 (select count(*) from nk_reviews r join nk_orders ro on ro.id=r.order_id where ro.asset_id=l.asset_id and r.profile_id=ro.renter_id and ro.status='COMPLETED') review_count,
 case when l.building_id=v_building then 0 when l.subzone_id=v_subzone then 1 else 2 end rank,
 nk_match_score(a.title,p_filter->>'q') match_score,
 case when v_start is not null and v_end is not null then ceil(extract(epoch from v_end-v_start)/(l.unit_minutes*60))*l.rate+l.deposit else l.rate+l.deposit end estimated_total,
 (v_start is not null and v_end is not null) dates_checked
 from nk_listings l join assets a on a.id=l.asset_id join profiles owner on owner.id=l.owner_id
 where l.area_id=v_area and l.status='ACTIVE' and a.owner_id=l.owner_id and nk_asset_usable(a.id) and not coalesce(a.is_locked,false) and upper(coalesce(a.dispute_status,'')) not in ('OPEN','DISPUTED','ACTIVE','PENDING') and owner.activation_status='ACTIVE' and owner.deleted_at is null
 and (coalesce(p_filter->>'asset','')='' or l.asset_id=p_filter->>'asset')
 and nk_match_score(a.title,left(p_filter->>'q',100))>=0.5
 and (coalesce(p_filter->>'category','')='' or a.category=p_filter->>'category')
 and (coalesce(p_filter->>'scope','AREA')<>'BUILDING' or l.building_id=nullif(p_filter->>'building','')::uuid)
 and (coalesce(p_filter->>'scope','AREA')<>'SUBZONE' or l.subzone_id=nullif(p_filter->>'subzone','')::uuid)
 and (nullif(p_filter->>'price','') is null or l.rate<=(p_filter->>'price')::bigint)
 and (nullif(p_filter->>'deposit','') is null or l.deposit<=(p_filter->>'deposit')::bigint)
 and nk_listing_geo_valid(l.asset_id) and nk_eligible(p_actor,l.asset_id)
 and (v_start is null or v_end is null or extract(epoch from v_end-v_start)/60>=l.min_minutes and nk_handover_window(l.asset_id,v_start,v_end))
 and (v_start is null or v_end is null or nk_calendar_free(l.asset_id,v_start,v_end,l.buffer_minutes))
 order by rank,a.title limit 100)x),'[]'::jsonb));
 end if;
 if p_actor is null then raise exception 'AUTH_REQUIRED';end if;
 if p_section='mine' then
 return jsonb_build_object(
 'memberships',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('status',case when status='VERIFIED' and verified_until<=now() then 'REVERIFY' else status end)) from nk_memberships m where profile_id=p_actor),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(x order by created_at desc) from(select id,asset_id,area_id,status,starts_at,ends_at,hold_until,payment_status,deposit_status,refund_status,dispute_status,snapshot,version,created_at,(owner_id=p_actor) is_owner from nk_orders where p_actor in (owner_id,renter_id) order by created_at desc limit 100)x),'[]'::jsonb),
 'listings',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('title',a.title,'images',a.images,'description',a.description,'category',a.category,'neighborhood_only',a.listing_data->>'neighborhoodOnly'='true')) from nk_listings l join assets a on a.id=l.asset_id where l.owner_id=p_actor),'[]'::jsonb),
 'assets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'images',images,'description',description,'category',category,'neighborhood_only',listing_data->>'neighborhoodOnly'='true')) from assets where owner_id=p_actor and status<>'removed'),'[]'::jsonb),
 'points',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'parent_id',p.parent_id,'area_id',nk_area(p.id))) from nk_places p where kind='HANDOVER' and status='ACTIVE' and exists(select 1 from nk_memberships where profile_id=p_actor and area_id=nk_area(p.id))),'[]'::jsonb),
 'needs',coalesce((select jsonb_agg(to_jsonb(n)) from nk_needs n where profile_id=p_actor),'[]'::jsonb),
 'offers',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('title',a.title,'rate',listing.rate,'deposit',listing.deposit,'unit_minutes',listing.unit_minutes,'scope',listing.scope)) from nk_offers f join nk_needs n on n.id=f.need_id join nk_listings listing on listing.asset_id=f.asset_id join assets a on a.id=f.asset_id where n.profile_id=p_actor or f.owner_id=p_actor),'[]'::jsonb),
 'blocks',coalesce((select jsonb_agg(to_jsonb(b)) from nk_blocks b where created_by=p_actor),'[]'::jsonb),
 'preferences',coalesce((select to_jsonb(p) from nk_preferences p where profile_id=p_actor),'{}'::jsonb),
 'notifications',coalesce((select jsonb_agg(x) from(select id,event,aggregate_id,category,status,created_at from nk_outbox where recipient_id=p_actor and status='SENT' order by created_at desc limit 50)x),'[]'::jsonb),
 'income',coalesce((select sum((snapshot->>'rent')::bigint) from nk_orders where owner_id=p_actor and payment_status='PAID' and refund_status='NONE'),0));end if;
 if p_section='order' then
 select * into o from nk_orders where id=(p_filter->>'id')::uuid and p_actor in (owner_id,renter_id);if not found then raise exception 'NOT_FOUND';end if;
 return jsonb_build_object('order',to_jsonb(o)-'handover_snapshot','events',coalesce((select jsonb_agg(to_jsonb(e) order by created_at) from nk_order_events e where order_id=o.id),'[]'::jsonb),
 'extensions',coalesce((select jsonb_agg(to_jsonb(e)) from nk_extensions e where order_id=o.id),'[]'::jsonb),
 'checks',coalesce((select jsonb_agg(to_jsonb(c)) from nk_handover_checks c where order_id=o.id),'[]'::jsonb),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from nk_reviews r where order_id=o.id),'[]'::jsonb),
 'disputes',coalesce((select jsonb_agg(to_jsonb(d)) from nk_disputes d where order_id=o.id),'[]'::jsonb),
 'handover',case when o.status in ('CONFIRMED','READY_FOR_HANDOVER','ACTIVE','RETURN_PENDING','COMPLETED') then o.handover_snapshot else null end);end if;
 if p_section='need' then
 return jsonb_build_object('need',(select to_jsonb(n)-'profile_id'||jsonb_build_object('mine',n.profile_id=p_actor,'expired',n.expires_at<=now()) from nk_needs n where n.id=(p_filter->>'id')::uuid and (n.profile_id=p_actor or exists(select 1 from nk_offers where need_id=n.id and owner_id=p_actor) or exists(select 1 from nk_outbox where aggregate_id=n.id::text and recipient_id=p_actor and event in ('NEED_MATCH','OFFER_NEW')))));
 end if;
 if p_section='admin' then
 if not reloo_staff_permission(p_actor,'neighborhood.read') then raise exception 'FORBIDDEN';end if;
 return jsonb_build_object('places',coalesce((select jsonb_agg(to_jsonb(p) order by updated_at desc) from nk_places p),'[]'::jsonb),'sources',coalesce((select jsonb_agg(to_jsonb(s)) from nk_sources s),'[]'::jsonb),'changes',coalesce((select jsonb_agg(to_jsonb(c)) from nk_place_changes c where status='PENDING'),'[]'::jsonb),
 'memberships',case when reloo_staff_permission(p_actor,'neighborhood.verify') then coalesce((select jsonb_agg(to_jsonb(m)) from nk_memberships m where status in ('PENDING','REVERIFY')),'[]'::jsonb) else '[]'::jsonb end,
 'listings',coalesce((select jsonb_agg(x) from(select to_jsonb(l)||jsonb_build_object('title',a.title) x from nk_listings l join assets a on a.id=l.asset_id order by l.updated_at desc limit 1000) listing_rows),'[]'::jsonb),'needs',coalesce((select jsonb_agg(to_jsonb(n)) from nk_needs n where status='OPEN' and expires_at>now()),'[]'::jsonb),
 'verifications',case when reloo_staff_permission(p_actor,'neighborhood.verify') then coalesce((select jsonb_agg(to_jsonb(v)) from nk_verifications v where status='PENDING'),'[]'::jsonb) else '[]'::jsonb end,'promotions',coalesce((select jsonb_agg(to_jsonb(v)) from nk_promotions v),'[]'::jsonb),'policies',coalesce((select jsonb_agg(to_jsonb(p)) from nk_policies p),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(x) from(select id,actor_id,resource_id,action,reason,correlation_id,created_at from nk_audit order by created_at desc limit 100)x),'[]'::jsonb),
 'jobs',coalesce((select jsonb_agg(x) from(select id,event,aggregate_id,status,attempts,last_error,created_at from nk_outbox order by created_at desc limit 100)x),'[]'::jsonb),'syncRuns',coalesce((select jsonb_agg(x) from(select * from nk_sync_runs order by started_at desc limit 30)x),'[]'::jsonb),
 'disputes',coalesce((select jsonb_agg(to_jsonb(d)) from nk_disputes d where status='OPEN'),'[]'::jsonb));end if;
 raise exception 'NOT_FOUND';
end $$;

create or replace function reloo_neighborhood_action(p_actor text,p_key uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare prior nk_operations;result jsonb:='{}';v_id uuid;v_area uuid;v_building uuid;v_subzone uuid;l nk_listings;o nk_orders;p nk_policies;m nk_memberships;inv nk_invites;n nk_needs;f nk_offers;c nk_handover_codes;x nk_extensions;
 v_start timestamptz;v_end timestamptz;q jsonb;v_event text;v_status text;v_other text;v_phase text;v_count integer;v_old jsonb;v_target nk_places;v_place nk_places;v_source nk_sources;v_fee bigint;v_rent bigint;
begin
 if p_actor is null or length(p_actor)>150 or p_key is null or jsonb_typeof(p_data)<>'object' then raise exception 'INVALID_INPUT';end if;
 perform set_config('reloo.neighborhood.correlation',p_key::text,true);
 perform pg_advisory_xact_lock(hashtextextended('nk-op:'||p_actor||p_key,0));
 select * into prior from nk_operations where actor_id=p_actor and key=p_key;
 if found then if prior.action<>p_action or prior.fingerprint<>coalesce(p_data->>'_requestHash',md5(p_data::text)) then raise exception 'REQUEST_CONFLICT';end if;return prior.result||jsonb_build_object('_replayed',true);end if;
 if p_action not in ('PREFERENCES','CLOSE_NEED','CANCEL','ISSUE','REFUND_ACK','DEPOSIT_RETURN_ACK') and not(p_action='HANDOVER' and p_data->>'phase'='RETURN') then perform reloo_assert_active(p_actor);end if;
 if (select count(*) from nk_operations where actor_id=p_actor and created_at>now()-interval '1 minute')>=50 then raise exception 'RATE_LIMITED';end if;
 if p_action like 'ADMIN_%' then
 if not reloo_staff_permission(p_actor,case when p_action in ('ADMIN_VERIFY','ADMIN_INVITE') then 'neighborhood.verify' else 'neighborhood.write' end) then raise exception 'FORBIDDEN';end if;
 if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'INVALID_INPUT';end if;
 end if;

 if p_action='SUGGEST_AREA' then
 if (select count(*) from nk_audit where actor_id=p_actor and action='SUGGEST_AREA' and created_at>now()-interval '1 day')>=3 then raise exception 'RATE_LIMITED';end if;
 insert into nk_places(kind,name,address_raw,address_normalized,source_id) values('AREA',p_data->>'name',coalesce(p_data->>'address',''),coalesce(p_data->>'address',''),'00000000-0000-4000-8000-000000000001') returning id into v_id;result:=jsonb_build_object('id',v_id);
 elsif p_action='MEMBERSHIP' then
 v_area:=(p_data->>'area')::uuid;v_building:=nullif(p_data->>'building','')::uuid;
 if not exists(select 1 from nk_places where id=v_area and kind='AREA' and status='ACTIVE') or (v_building is not null and not exists(select 1 from nk_places where id=v_building and kind='BUILDING' and status='ACTIVE' and nk_area(id)=v_area)) then raise exception 'INVALID_INPUT';end if;
 insert into nk_memberships(profile_id,area_id,building_id,public_building) values(p_actor,v_area,v_building,coalesce((p_data->>'visible')::boolean,false))
 on conflict(profile_id,area_id) do update set building_id=excluded.building_id,public_building=excluded.public_building,status=case when nk_memberships.building_id is distinct from excluded.building_id and nk_memberships.status in ('VERIFIED','PENDING') then 'REVERIFY' else nk_memberships.status end,verified_until=case when nk_memberships.building_id is distinct from excluded.building_id then null else nk_memberships.verified_until end,updated_at=now() returning id into v_id;result:=jsonb_build_object('id',v_id);
 elsif p_action='VERIFY' then
 select * into m from nk_memberships where id=(p_data->>'membership')::uuid and profile_id=p_actor for update;if not found then raise exception 'NOT_FOUND';end if;
 if not exists(select 1 from nk_places where id=m.area_id and status='ACTIVE' and merged_into is null) then raise exception 'NOT_FOUND';end if;
 if m.building_id is not null and nk_area(m.building_id) is distinct from m.area_id then raise exception 'INVALID_INPUT';end if;
 if (m.status='VERIFIED' and m.verified_until>now()) or exists(select 1 from nk_verifications where membership_id=m.id and status='PENDING') then raise exception 'INVALID_STATE';end if;
 v_status:='PENDING';
 if coalesce(p_data->>'inviteHash','')<>'' then
 select * into inv from nk_invites where code_hash=p_data->>'inviteHash' for update;
 if not found or inv.area_id<>m.area_id or inv.expires_at<=now() or inv.used_by is not null or (inv.building_id is not null and inv.building_id is distinct from m.building_id) or (inv.intended_profile is not null and inv.intended_profile<>p_actor) then raise exception 'INVITE_INVALID';end if;
 update nk_invites set used_by=p_actor where id=inv.id;v_status:='VERIFIED';end if;
 insert into nk_verifications(membership_id,method,status,note,reviewed_by,reviewed_at) values(m.id,case when v_status='VERIFIED' then 'INVITE' else 'MANUAL' end,v_status,left(p_data->>'note',500),case when v_status='VERIFIED' then inv.created_by else null end,case when v_status='VERIFIED' then now() else null end);
 update nk_memberships set status=v_status,verified_until=case when v_status='VERIFIED' then now()+interval '180 days' else null end,updated_at=now(),reason=null where id=m.id;
 perform nk_emit(case when v_status='VERIFIED' then 'RESIDENCY_UPDATED' else 'RESIDENCY_REQUESTED' end,m.id::text,p_actor,p_key);result:=jsonb_build_object('status',v_status);
 elsif p_action='PREFERENCES' then
 insert into nk_preferences(profile_id,locale,match_enabled,marketing_enabled,quiet_start,quiet_end,daily_cap) values(p_actor,p_data->>'locale',(p_data->>'match')::boolean,(p_data->>'marketing')::boolean,(p_data->>'quietStart')::integer,(p_data->>'quietEnd')::integer,(p_data->>'cap')::integer) on conflict(profile_id) do update set locale=excluded.locale,match_enabled=excluded.match_enabled,marketing_enabled=excluded.marketing_enabled,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,daily_cap=excluded.daily_cap;
 elsif p_action='LISTING' then
 v_area:=(p_data->>'area')::uuid;v_building:=nullif(p_data->>'building','')::uuid;v_subzone:=nullif(p_data->>'subzone','')::uuid;
 if v_subzone is null and v_building is not null then select b.parent_id into v_subzone from nk_places b join nk_places parent on parent.id=b.parent_id and parent.kind='SUBZONE' where b.id=v_building;end if;
 if not exists(select 1 from nk_places where id=v_area and kind='AREA' and status='ACTIVE') or not exists(select 1 from nk_places where id=(p_data->>'point')::uuid and kind='HANDOVER' and status='ACTIVE' and nk_area(id)=v_area) then raise exception 'INVALID_INPUT';end if;
 if (v_building is not null and not exists(select 1 from nk_places where id=v_building and kind='BUILDING' and nk_area(id)=v_area and status='ACTIVE' and (v_subzone is null or parent_id=v_subzone))) or (v_subzone is not null and not exists(select 1 from nk_places where id=v_subzone and kind='SUBZONE' and parent_id=v_area and status='ACTIVE')) or (p_data->>'scope'='BUILDING' and v_building is null) or (p_data->>'scope'='SUBZONE' and v_subzone is null) then raise exception 'INVALID_INPUT';end if;
 if not exists(select 1 from nk_memberships where profile_id=p_actor and area_id=v_area and status not in ('REJECTED','REVOKED')) then raise exception 'RESIDENCY_REQUIRED';end if;
 if coalesce(p_data->>'asset','')='' then
 insert into assets(id,owner_id,title,description,category,daily_price,market_value,images,condition,status,listing_data) values('nk_'||gen_random_uuid()::text,p_actor,p_data->>'title',p_data->>'description',p_data->>'category',(p_data->>'rate')::bigint,0,coalesce(p_data->'images','[]'),p_data->>'condition','paused',jsonb_build_object('transactionMode','RENTAL','neighborhoodOnly',true)) returning id into v_other;
 else v_other:=p_data->>'asset';perform 1 from assets where id=v_other and owner_id=p_actor and status<>'removed' and not coalesce(is_locked,false) for update;if not found then raise exception 'FORBIDDEN';end if;
 if exists(select 1 from assets where id=v_other and listing_data->>'neighborhoodOnly'='true') then
 update assets set title=case when length(trim(coalesce(p_data->>'title','')))>=3 then p_data->>'title' else title end,description=coalesce(p_data->>'description',description),category=coalesce(p_data->>'category',category),condition=p_data->>'condition',images=case when jsonb_array_length(coalesce(p_data->'images','[]'))>0 then p_data->'images' else images end where id=v_other;
 end if;end if;
 if exists(select 1 from nk_orders where asset_id=v_other and (status not in ('COMPLETED','CANCELLED','EXPIRED') or dispute_status='DISPUTED')) then raise exception 'INVALID_STATE';end if;
 insert into nk_listings(asset_id,owner_id,area_id,subzone_id,building_id,handover_id,scope,verified_only,instant,rate,unit_minutes,deposit,min_minutes,buffer_minutes,accessories,condition,instructions)
 values(v_other,p_actor,v_area,v_subzone,v_building,(p_data->>'point')::uuid,p_data->>'scope',(p_data->>'verifiedOnly')::boolean,(p_data->>'instant')::boolean,(p_data->>'rate')::bigint,(p_data->>'unitMinutes')::integer,(p_data->>'deposit')::bigint,(p_data->>'minMinutes')::integer,(p_data->>'bufferMinutes')::integer,p_data->'accessories',p_data->>'condition',p_data->>'instructions')
 on conflict(asset_id) do update set owner_id=excluded.owner_id,area_id=excluded.area_id,subzone_id=excluded.subzone_id,building_id=excluded.building_id,handover_id=excluded.handover_id,scope=excluded.scope,verified_only=excluded.verified_only,instant=excluded.instant,rate=excluded.rate,unit_minutes=excluded.unit_minutes,deposit=excluded.deposit,min_minutes=excluded.min_minutes,buffer_minutes=excluded.buffer_minutes,accessories=excluded.accessories,condition=excluded.condition,instructions=excluded.instructions,status='PENDING',version=nk_listings.version+1,updated_at=now();result:=jsonb_build_object('asset',v_other,'status','PENDING');
 update nk_listings set handover_start=coalesce((p_data->>'handoverStart')::integer,0),handover_end=coalesce((p_data->>'handoverEnd')::integer,24) where asset_id=v_other;
 elsif p_action in ('BLOCK','REMOVE_BLOCK') then
 if p_action='BLOCK' then select * into l from nk_listings where asset_id=p_data->>'asset' and owner_id=p_actor;else select l1.* into l from nk_listings l1 join nk_blocks b on b.asset_id=l1.asset_id where b.id=(p_data->>'id')::uuid and l1.owner_id=p_actor;end if;
 if not found then raise exception 'FORBIDDEN';end if;perform 1 from assets where id=l.asset_id for update;
 if p_action='BLOCK' then v_start:=(p_data->>'start')::timestamptz;v_end:=(p_data->>'end')::timestamptz;if not nk_calendar_free(l.asset_id,v_start,v_end,l.buffer_minutes) then raise exception 'SLOT_CONFLICT';end if;insert into nk_blocks(asset_id,starts_at,ends_at,created_by) values(l.asset_id,v_start,v_end,p_actor);else delete from nk_blocks where id=(p_data->>'id')::uuid;end if;
 elsif p_action in ('NEED','EDIT_NEED','CLOSE_NEED') then
 if p_action<>'NEED' then select * into n from nk_needs where id=(p_data->>'id')::uuid and profile_id=p_actor for update;if not found then raise exception 'NOT_FOUND';end if;if p_action='EDIT_NEED' and n.status<>'OPEN' then raise exception 'INVALID_STATE';end if;end if;
 if p_action='CLOSE_NEED' then update nk_needs set status='CLOSED' where id=n.id;
 else
 v_area:=(p_data->>'area')::uuid;v_start:=(p_data->>'start')::timestamptz;v_end:=(p_data->>'end')::timestamptz;v_building:=nullif(p_data->>'building','')::uuid;v_subzone:=nullif(p_data->>'subzone','')::uuid;
 if v_subzone is null and v_building is not null then select b.parent_id into v_subzone from nk_places b join nk_places parent on parent.id=b.parent_id and parent.kind='SUBZONE' where b.id=v_building;end if;
 if not exists(select 1 from nk_places where id=v_area and enabled and status='ACTIVE') then raise exception 'AREA_DISABLED';end if;
 if v_end<=v_start or v_start<now()-interval '5 minutes' or v_end>v_start+interval '90 days' then raise exception 'INVALID_TIME';end if;
 if (v_building is not null and nk_area(v_building) is distinct from v_area) or (v_subzone is not null and nk_area(v_subzone) is distinct from v_area) or (p_data->>'scope'='BUILDING' and v_building is null) or (p_data->>'scope'='SUBZONE' and v_subzone is null) then raise exception 'INVALID_INPUT';end if;
 if p_action='NEED' then
 if (select count(*) from nk_needs where profile_id=p_actor and created_at>now()-interval '1 day')>=5 then raise exception 'RATE_LIMITED';end if;
 insert into nk_needs(profile_id,area_id,subzone_id,building_id,scope,title,category,note,starts_at,ends_at,budget,images,expires_at) values(p_actor,v_area,v_subzone,v_building,p_data->>'scope',p_data->>'title',p_data->>'category',p_data->>'note',v_start,v_end,nullif(p_data->>'budget','')::bigint,coalesce(p_data->'images','[]'),least(v_start,now()+interval '7 days')) returning id into v_id;
 else update nk_needs set title=p_data->>'title',note=p_data->>'note',starts_at=v_start,ends_at=v_end,budget=nullif(p_data->>'budget','')::bigint,expires_at=least(v_start,now()+interval '7 days') where id=n.id and status='OPEN';v_id:=n.id;end if;
 insert into nk_outbox(event,category,aggregate_id,recipient_id,correlation_id,dedup_key,expires_at)
 select 'NEED_MATCH','match',v_id::text,candidate.owner_id,p_key,p_key||':NEED_MATCH:'||candidate.owner_id,least(v_start,now()+interval '1 day')
 from nk_listings candidate join assets a on a.id=candidate.asset_id join nk_preferences pref on pref.profile_id=candidate.owner_id and pref.match_enabled
 where candidate.area_id=v_area and candidate.status='ACTIVE' and nk_asset_usable(a.id) and a.category=p_data->>'category' and nk_match_score(a.title,p_data->>'title')>=0.6 and not coalesce(a.is_locked,false) and candidate.owner_id<>p_actor and nk_eligible(p_actor,candidate.asset_id) and (p_data->>'scope'='AREA' or p_data->>'scope'='BUILDING' and candidate.building_id=v_building or p_data->>'scope'='SUBZONE' and candidate.subzone_id=v_subzone) and nk_calendar_free(candidate.asset_id,v_start,v_end,candidate.buffer_minutes) group by candidate.owner_id on conflict do nothing;result:=jsonb_build_object('id',v_id);end if;
 elsif p_action='OFFER' then
 select * into n from nk_needs where id=(p_data->>'need')::uuid and status='OPEN' and expires_at>now();select * into l from nk_listings where asset_id=p_data->>'asset' and owner_id=p_actor and status='ACTIVE';
 if n.id is null or l.asset_id is null or n.profile_id=p_actor or n.area_id<>l.area_id or (n.scope='BUILDING' and l.building_id is distinct from n.building_id) or (n.scope='SUBZONE' and l.subzone_id is distinct from n.subzone_id) or not nk_eligible(n.profile_id,l.asset_id) or not exists(select 1 from assets where id=l.asset_id and owner_id=l.owner_id and nk_asset_usable(id) and category=n.category and (status='available' or (status='paused' and listing_data->>'neighborhoodOnly'='true')) and not coalesce(is_locked,false)) or not nk_calendar_free(l.asset_id,n.starts_at,n.ends_at,l.buffer_minutes) then raise exception 'FORBIDDEN';end if;
 perform reloo_assert_active(n.profile_id);
 insert into nk_offers(need_id,asset_id,owner_id,note) values(n.id,l.asset_id,p_actor,p_data->>'note') on conflict(need_id,asset_id) do update set note=excluded.note returning id into v_id;
 perform nk_emit('OFFER_NEW',n.id::text,n.profile_id,p_key);result:=jsonb_build_object('id',v_id);
 elsif p_action in ('BOOK','BOOK_DRAFT') then
 select * into l from nk_listings where asset_id=p_data->>'asset' and status='ACTIVE';if not found then raise exception 'NOT_FOUND';end if;
 perform 1 from assets where id=l.asset_id and owner_id=l.owner_id and (status='available' or (status='paused' and listing_data->>'neighborhoodOnly'='true')) and not coalesce(is_locked,false) and upper(coalesce(dispute_status,'')) not in ('OPEN','DISPUTED','ACTIVE','PENDING') for update;if not found then raise exception 'NOT_FOUND';end if;
 if l.owner_id=p_actor then raise exception 'FORBIDDEN';end if;perform reloo_assert_active(l.owner_id);
 if not exists(select 1 from verified_identities where profile_id=p_actor and expires_at>now()) then raise exception 'IDENTITY_REQUIRED';end if;
 if not nk_eligible(p_actor,l.asset_id) then raise exception 'RESIDENCY_REQUIRED';end if;
 if not exists(select 1 from nk_memberships where profile_id=p_actor and area_id=l.area_id and status not in ('REJECTED','REVOKED')) then raise exception 'RESIDENCY_REQUIRED';end if;
 if not exists(select 1 from nk_places where id=l.area_id and enabled and status='ACTIVE') then raise exception 'AREA_DISABLED';end if;
 v_start:=(p_data->>'start')::timestamptz;v_end:=(p_data->>'end')::timestamptz;
 if nullif(p_data->>'promotion','') is not null then perform 1 from nk_promotions where id=(p_data->>'promotion')::uuid for update;end if;
 q:=nk_promotion_quote(p_actor,l.area_id,nullif(p_data->>'promotion','')::uuid,nk_quote(l.asset_id,v_start,v_end));
 if (p_data->>'policyVersion')::integer is distinct from (q->>'policyVersion')::integer or (p_data->>'listingVersion')::integer is distinct from l.version or (p_data->>'total')::bigint is distinct from (q->>'total')::bigint or p_data->>'agreed'<>'true' then raise exception 'POLICY_CHANGED';end if;
 if not nk_calendar_free(l.asset_id,v_start,v_end,l.buffer_minutes) then raise exception 'SLOT_CONFLICT';end if;
 if coalesce(p_data->>'offer','')<>'' then
 select * into f from nk_offers where id=(p_data->>'offer')::uuid;select * into n from nk_needs where id=f.need_id and profile_id=p_actor and status='OPEN' and expires_at>now();
 if n.id is null or f.asset_id<>l.asset_id or n.starts_at<>v_start or n.ends_at<>v_end then raise exception 'INVALID_INPUT';end if;end if;
 v_status:=case when p_action='BOOK_DRAFT' then 'DRAFT' when l.instant then 'PENDING_PAYMENT' else 'PENDING_OWNER' end;
 insert into nk_orders(asset_id,owner_id,renter_id,area_id,need_id,offer_id,handover_id,starts_at,ends_at,block_until,hold_until,status,deposit_status,snapshot,handover_snapshot)
 values(l.asset_id,l.owner_id,p_actor,l.area_id,n.id,f.id,l.handover_id,v_start,v_end,v_end+make_interval(mins=>l.buffer_minutes),least(v_start,now()+make_interval(mins=>case when l.instant then (q->>'paymentMinutes')::integer else (q->>'holdMinutes')::integer end)),v_status,case when l.deposit>0 then 'UNPAID' else 'NOT_REQUIRED' end,q,(select jsonb_build_object('id',id,'name',name,'address',address_normalized,'geometry',geometry,'version',version) from nk_places where id=l.handover_id)) returning id into v_id;
 insert into nk_order_events(order_id,actor_id,action,correlation_id) values(v_id,p_actor,'BOOK',p_key);
 if p_action='BOOK' then perform nk_claim_promotion(p_actor,v_id,q);end if;
 if v_status<>'DRAFT' then perform nk_emit('RENTAL_REQUESTED',v_id::text,l.owner_id,p_key);perform nk_emit(case when l.instant then 'PAYMENT_PENDING' else 'RENTAL_REQUESTED' end,v_id::text,p_actor,p_key);end if;result:=jsonb_build_object('id',v_id,'status',v_status);
 elsif p_action='ADMIN_PROMOTION' then
 insert into nk_promotions(area_id,budget,amount,expires_at,verified_only,enabled,title,terms) values((p_data->>'area')::uuid,(p_data->>'budget')::bigint,(p_data->>'amount')::bigint,(p_data->>'expires')::timestamptz,true,coalesce((p_data->>'enabled')::boolean,false),p_data->'title',p_data->'terms') returning id into v_id;result:=jsonb_build_object('id',v_id);
 elsif p_action='ADMIN_SOURCE' then
 if p_data->>'provider' not in ('MANUAL','PARTNER_JSON') or p_data->>'storageAllowed'<>'true' then raise exception 'SOURCE_NOT_ALLOWED';end if;
 v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());select to_jsonb(src) into v_old from nk_sources src where id=v_id;
 if v_id='00000000-0000-4000-8000-000000000001' and p_data->>'provider'<>'MANUAL' then raise exception 'INVALID_INPUT';end if;
 insert into nk_sources(id,name,provider,terms,attribution,storage_allowed,feed_url,sync_minutes,enabled,next_run) values(v_id,p_data->>'name',p_data->>'provider',p_data->>'terms',p_data->>'attribution',true,nullif(p_data->>'feedUrl',''),(p_data->>'syncMinutes')::integer,coalesce((p_data->>'enabled')::boolean,false),now())
 on conflict(id) do update set name=excluded.name,provider=excluded.provider,terms=excluded.terms,attribution=excluded.attribution,feed_url=excluded.feed_url,sync_minutes=excluded.sync_minutes,enabled=excluded.enabled,next_run=now(),version=nk_sources.version+1,updated_at=now();result:=jsonb_build_object('id',v_id);
 elsif p_action='ADMIN_PLACE' then
 v_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());select to_jsonb(t) into v_old from nk_places t where id=v_id;
 insert into nk_places(id,kind,parent_id,name,aliases,address_raw,address_normalized,administrative,geometry,source_id,external_id,source_version,confidence)
 values(v_id,p_data->>'kind',nullif(p_data->>'parent','')::uuid,p_data->>'name',array(select jsonb_array_elements_text(coalesce(p_data->'aliases','[]'))),p_data->>'addressRaw',p_data->>'address',coalesce(p_data->'administrative','{}'),nullif(p_data->'geometry','null'),coalesce(nullif(p_data->>'source','')::uuid,'00000000-0000-4000-8000-000000000001'),nullif(p_data->>'externalId',''),p_data->>'sourceVersion',coalesce((p_data->>'confidence')::numeric,0))
 on conflict(id) do update set parent_id=excluded.parent_id,name=excluded.name,aliases=excluded.aliases,address_raw=excluded.address_raw,address_normalized=excluded.address_normalized,administrative=excluded.administrative,geometry=excluded.geometry,status='PENDING',verification='UNREVIEWED',version=nk_places.version+1,updated_at=now();result:=jsonb_build_object('id',v_id);
 elsif p_action in ('ADMIN_PLACE_REVIEW','ADMIN_LOCK','ADMIN_MERGE') then
 select * into v_place from nk_places where id=(p_data->>'id')::uuid for update;if not found then raise exception 'NOT_FOUND';end if;v_old:=to_jsonb(v_place);v_id:=v_place.id;
 if p_action='ADMIN_PLACE_REVIEW' then
 if p_data->>'decision' not in ('ACTIVE','ARCHIVED') then raise exception 'INVALID_INPUT';end if;
 if p_data->>'decision'='ACTIVE' and v_place.parent_id is not null and not exists(select 1 from nk_places where id=v_place.parent_id and status='ACTIVE') then raise exception 'INVALID_INPUT';end if;
 update nk_places set status=p_data->>'decision',verification='ADMIN_REVIEWED',version=version+1,updated_at=now() where id=v_id;
 elsif p_action='ADMIN_LOCK' then update nk_places set admin_locked=coalesce((p_data->>'locked')::boolean,true),updated_at=now() where id=v_id;
 else
 select * into v_target from nk_places where id=(p_data->>'target')::uuid for update;
 if not found or v_target.kind<>v_place.kind or v_target.id=v_place.id or v_target.status<>'ACTIVE' or v_target.merged_into is not null or (v_place.parent_id is distinct from v_target.parent_id) then raise exception 'INVALID_INPUT';end if;
 -- Keep transaction foreign keys/snapshots stable. Only current catalog/settings
 -- move; affected listings and residency are reviewed again, never auto-verified.
 update nk_places set parent_id=v_target.id,version=version+1,updated_at=now() where parent_id=v_id;
 if v_place.kind='AREA' then
 for m in select * from nk_memberships where area_id=v_id for update loop
 if exists(select 1 from nk_memberships where profile_id=m.profile_id and area_id=v_target.id) then
 update nk_memberships set status='REVERIFY',verified_until=null,reason='CATALOG_MERGED',updated_at=now() where profile_id=m.profile_id and area_id=v_target.id;
 update nk_memberships set status='REVOKED',verified_until=null,reason='CATALOG_MERGED',updated_at=now() where id=m.id;
 else update nk_memberships set area_id=v_target.id,status='REVERIFY',verified_until=null,reason='CATALOG_MERGED',updated_at=now() where id=m.id;end if;
 perform nk_emit('RESIDENCY_UPDATED',m.id::text,m.profile_id,p_key);
 end loop;
 update nk_listings set area_id=v_target.id,status='PENDING',version=version+1 where area_id=v_id;
 update nk_needs set area_id=v_target.id where area_id=v_id;
 update nk_invites set expires_at=least(expires_at,now()) where area_id=v_id;
 elsif v_place.kind='SUBZONE' then
 update nk_listings set subzone_id=v_target.id,status='PENDING',version=version+1 where subzone_id=v_id;update nk_needs set subzone_id=v_target.id where subzone_id=v_id;
 elsif v_place.kind='BUILDING' then
 for m in select * from nk_memberships where building_id=v_id for update loop
 update nk_memberships set building_id=v_target.id,status='REVERIFY',verified_until=null,reason='CATALOG_MERGED',updated_at=now() where id=m.id;perform nk_emit('RESIDENCY_UPDATED',m.id::text,m.profile_id,p_key);end loop;
 update nk_listings set building_id=v_target.id,status='PENDING',version=version+1 where building_id=v_id;update nk_needs set building_id=v_target.id where building_id=v_id;
 update nk_invites set expires_at=least(expires_at,now()) where building_id=v_id;
 else update nk_listings set handover_id=v_target.id,status='PENDING',version=version+1 where handover_id=v_id;end if;
 update nk_places set aliases=array(select distinct unnest(aliases||v_place.aliases||array[v_place.name])),version=version+1,updated_at=now() where id=v_target.id;
 update nk_places set status='ARCHIVED',enabled=false,merged_into=v_target.id,updated_at=now() where id=v_id;
 end if;
 elsif p_action='ADMIN_POLICY' then
 v_area:=(p_data->>'area')::uuid;perform 1 from nk_places where id=v_area and kind='AREA' and status='ACTIVE' for update;if not found then raise exception 'NOT_FOUND';end if;
 insert into nk_policies(area_id,version,terms,fee_bps,hold_minutes,payment_minutes,cancel_before_hours,published_by)
 values(v_area,coalesce((select max(version) from nk_policies where area_id=v_area),0)+1,p_data->'terms',(p_data->>'feeBps')::integer,(p_data->>'holdMinutes')::integer,(p_data->>'paymentMinutes')::integer,(p_data->>'cancelBeforeHours')::integer,p_actor) returning id into v_id;
 elsif p_action='ADMIN_ENABLE' then
 v_id:=(p_data->>'id')::uuid;if not exists(select 1 from nk_policies where area_id=v_id) and p_data->>'enabled'='true' then raise exception 'POLICY_CHANGED';end if;
 update nk_places set enabled=(p_data->>'enabled')::boolean where id=v_id and kind='AREA' and status='ACTIVE';if not found then raise exception 'NOT_FOUND';end if;
 elsif p_action='ADMIN_VERIFY' then
 select * into m from nk_memberships where id=(p_data->>'id')::uuid for update;if not found then raise exception 'NOT_FOUND';end if;
 if p_data->>'status' not in ('VERIFIED','REJECTED','REVOKED','REVERIFY') then raise exception 'INVALID_INPUT';end if;
 if p_data->>'status'='VERIFIED' and m.building_id is not null and nk_area(m.building_id) is distinct from m.area_id then raise exception 'INVALID_INPUT';end if;
 v_old:=to_jsonb(m);v_id:=m.id;
 update nk_memberships set status=p_data->>'status',reason=p_data->>'reason',verified_until=case when p_data->>'status'='VERIFIED' then now()+interval '180 days' else null end,updated_at=now() where id=m.id;
 update nk_verifications set status=p_data->>'status',reason=p_data->>'reason',reviewed_by=p_actor,reviewed_at=now() where membership_id=m.id and status='PENDING';perform nk_emit('RESIDENCY_UPDATED',m.id::text,m.profile_id,p_key);
 elsif p_action='ADMIN_INVITE' then
 insert into nk_invites(code_hash,area_id,building_id,intended_profile,expires_at,created_by) values(p_data->>'codeHash',(p_data->>'area')::uuid,nullif(p_data->>'building','')::uuid,nullif(p_data->>'profile',''),now()+make_interval(hours=>(p_data->>'hours')::integer),p_actor) returning id into v_id;result:=jsonb_build_object('id',v_id);
 elsif p_action='ADMIN_LISTING' then
 select * into l from nk_listings where asset_id=p_data->>'asset' for update;if not found then raise exception 'NOT_FOUND';end if;
 if p_data->>'status' not in ('ACTIVE','REJECTED','PAUSED') then raise exception 'INVALID_INPUT';end if;
 update nk_listings set status=p_data->>'status',version=version+1 where asset_id=l.asset_id;
 if p_data->>'status'='ACTIVE' and not nk_listing_geo_valid(l.asset_id) then raise exception 'INVALID_STATE';end if;
 if p_data->>'status'='ACTIVE' then update assets set status='paused' where id=l.asset_id and listing_data->>'neighborhoodOnly'='true';end if;
 if p_data->>'status'='ACTIVE' then
 for n in select request.* from nk_needs request join nk_preferences pref on pref.profile_id=request.profile_id and pref.match_enabled join assets a on a.id=l.asset_id
 where request.area_id=l.area_id and request.profile_id<>l.owner_id and request.status='OPEN' and request.expires_at>now() and request.category=a.category and nk_asset_usable(a.id)
 and nk_match_score(a.title,request.title)>=0.6 and nk_eligible(request.profile_id,l.asset_id)
 and (request.scope='AREA' or request.scope='BUILDING' and request.building_id=l.building_id or request.scope='SUBZONE' and request.subzone_id=l.subzone_id)
 and nk_calendar_free(l.asset_id,request.starts_at,request.ends_at,l.buffer_minutes) and nk_handover_window(l.asset_id,request.starts_at,request.ends_at)
 loop perform nk_emit('ITEM_MATCH',n.id::text,n.profile_id,p_key,'match',l.asset_id);end loop;end if;
 elsif p_action='ADMIN_CHANGE' then
 select proposal,place_id,source_id,external_id into q,v_id,v_area,v_other from nk_place_changes where id=(p_data->>'id')::uuid and status='PENDING' for update;if not found then raise exception 'NOT_FOUND';end if;
 select to_jsonb(existing) into v_old from nk_places existing where id=v_id;
 if p_data->>'decision'='APPROVED' then
 if q->>'parentExternalId' is not null and coalesce(q->>'parent','')='' then q:=q||jsonb_build_object('parent',(select id from nk_places where source_id=v_area and external_id=q->>'parentExternalId' and status='ACTIVE'));end if;
 if exists(select 1 from nk_places where id=v_id and admin_locked) then raise exception 'ADMIN_LOCKED';end if;
 if nullif(q->>'parent','') is not null and not exists(select 1 from nk_places where id=(q->>'parent')::uuid and status='ACTIVE') then raise exception 'INVALID_INPUT';end if;
 if v_id is null then insert into nk_places(kind,parent_id,name,aliases,address_raw,address_normalized,geometry,administrative,source_id,external_id,source_version,confidence)
 values(q->>'kind',nullif(q->>'parent','')::uuid,q->>'name',array(select jsonb_array_elements_text(coalesce(q->'aliases','[]'))),q->>'addressRaw',q->>'address',nullif(q->'geometry','null'),coalesce(q->'administrative','{}'),v_area,v_other,q->>'sourceVersion',coalesce((q->>'confidence')::numeric,0)) returning id into v_id;
 else
 if (select kind from nk_places where id=v_id)<>q->>'kind' then raise exception 'INVALID_INPUT';end if;
 update nk_places set parent_id=nullif(q->>'parent','')::uuid,name=q->>'name',aliases=array(select jsonb_array_elements_text(coalesce(q->'aliases','[]'))),address_raw=q->>'addressRaw',address_normalized=q->>'address',geometry=nullif(q->'geometry','null'),administrative=coalesce(q->'administrative','{}'),source_version=q->>'sourceVersion',confidence=coalesce((q->>'confidence')::numeric,0),version=version+1,updated_at=now() where id=v_id;end if;
 update nk_places set status='ACTIVE',verification='ADMIN_REVIEWED' where id=v_id;
 elsif p_data->>'decision'<>'REJECTED' then raise exception 'INVALID_INPUT';end if;
 update nk_place_changes set status=p_data->>'decision',place_id=v_id where id=(p_data->>'id')::uuid;
 elsif p_action='ADMIN_CLOSE_NEED' then
 update nk_needs set status='CANCELLED' where id=(p_data->>'id')::uuid;if not found then raise exception 'NOT_FOUND';end if;v_id:=(p_data->>'id')::uuid;
 elsif p_action='ADMIN_RETRY' then
 update nk_outbox set status='QUEUED',attempts=0,available_at=now(),last_error=null where id=(p_data->>'id')::uuid and status in ('FAILED','DEAD') and expires_at>now();if not found then raise exception 'INVALID_STATE';end if;
 elsif p_action='ADMIN_SYNC' then update nk_sources set next_run=greatest(now(),coalesce(last_attempt,'-infinity'::timestamptz)+make_interval(mins=>sync_minutes)) where id=(p_data->>'id')::uuid and enabled and provider='PARTNER_JSON';if not found then raise exception 'INVALID_STATE';end if;
 else
 -- Every order mutation rechecks resource ownership and serializes on the asset.
 select * into o from nk_orders where id=(p_data->>'id')::uuid;
 if not found or (p_actor not in (o.owner_id,o.renter_id) and not(p_action='RESOLVE' and reloo_staff_permission(p_actor,'neighborhood.write'))) then raise exception 'NOT_FOUND';end if;
 perform 1 from assets where id=o.asset_id for update;select * into o from nk_orders where id=o.id for update;
 v_id:=o.id;v_old:=to_jsonb(o);v_other:=case when p_actor=o.owner_id then o.renter_id else o.owner_id end;v_status:=o.status;
 if p_action in ('SUBMIT_DRAFT','ACCEPT','PAYMENT_ACK','DEPOSIT_ACK','READY','EXTEND','EXTENSION_ACCEPT','EXTENSION_PAID') or (p_action='HANDOVER' and p_data->>'phase'='PICKUP') then
 perform reloo_assert_active(o.owner_id);perform reloo_assert_active(o.renter_id);
 if not exists(select 1 from verified_identities where profile_id=o.renter_id and expires_at>now()) then raise exception 'IDENTITY_REQUIRED';end if;
 if not nk_eligible(o.renter_id,o.asset_id) then raise exception 'RESIDENCY_REQUIRED';end if;
 end if;
 if o.status in ('PENDING_OWNER','PENDING_PAYMENT') and o.hold_until<=now() and p_action not in ('CANCEL','ISSUE') then raise exception 'EXPIRED_HOLD';end if;
 if coalesce((p_data->>'version')::integer,o.version)<>o.version then raise exception 'INVALID_STATE';end if;
 if p_action='SUBMIT_DRAFT' then
 if o.status<>'DRAFT' or p_actor<>o.renter_id then raise exception 'INVALID_STATE';end if;
 select * into l from nk_listings where asset_id=o.asset_id and status='ACTIVE';if not found then raise exception 'NOT_FOUND';end if;
 q:=nk_promotion_quote(p_actor,o.area_id,nullif(o.snapshot->>'promotion','')::uuid,nk_quote(o.asset_id,o.starts_at,o.ends_at));if q is distinct from o.snapshot then raise exception 'POLICY_CHANGED';end if;
 if not nk_calendar_free(o.asset_id,o.starts_at,o.ends_at,l.buffer_minutes,o.id) then raise exception 'SLOT_CONFLICT';end if;
 v_status:=case when l.instant then 'PENDING_PAYMENT' else 'PENDING_OWNER' end;
 update nk_orders set hold_until=least(starts_at,now()+make_interval(mins=>case when l.instant then (snapshot->>'paymentMinutes')::integer else (snapshot->>'holdMinutes')::integer end)) where id=o.id;v_event:='RENTAL_REQUESTED';
 perform nk_claim_promotion(p_actor,o.id,q);
 elsif p_action='ACCEPT' then
 if p_actor<>o.owner_id or o.status<>'PENDING_OWNER' then raise exception 'INVALID_STATE';end if;v_status:='PENDING_PAYMENT';update nk_orders set hold_until=least(starts_at,now()+make_interval(mins=>(snapshot->>'paymentMinutes')::integer)) where id=o.id;v_event:='OWNER_ACCEPTED';
 elsif p_action in ('REJECT','CANCEL') then
 if (p_action='REJECT' and (p_actor<>o.owner_id or o.status<>'PENDING_OWNER')) or o.status not in ('DRAFT','PENDING_OWNER','PENDING_PAYMENT','CONFIRMED','READY_FOR_HANDOVER') then raise exception 'INVALID_STATE';end if;
 if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'INVALID_INPUT';end if;
 if o.dispute_status='DISPUTED' then raise exception 'INVALID_STATE';end if;
 if o.status in ('CONFIRMED','READY_FOR_HANDOVER') and o.starts_at-now()<make_interval(hours=>(o.snapshot->>'cancelBeforeHours')::integer) then raise exception 'INVALID_STATE';end if;
 v_status:='CANCELLED';update nk_orders set refund_status=case when payment_status='PAID' then 'REFUND_PENDING' else 'NONE' end where id=o.id;v_event:=case when p_action='REJECT' then 'OWNER_REJECTED' else 'ORDER_CANCELLED' end;
 elsif p_action='PAYMENT_REPORT' then
 if p_actor<>o.renter_id or o.status<>'PENDING_PAYMENT' or o.payment_status<>'UNPAID' then raise exception 'INVALID_STATE';end if;
 update nk_orders set payment_status='REPORTED' where id=o.id;v_event:='PAYMENT_PENDING';
 elsif p_action='PAYMENT_ACK' then
 if p_actor<>o.owner_id or o.status<>'PENDING_PAYMENT' or o.payment_status<>'REPORTED' then raise exception 'INVALID_STATE';end if;
 update nk_orders set payment_status='PAID' where id=o.id;v_event:='PAYMENT_CONFIRMED';if o.deposit_status='NOT_REQUIRED' or o.deposit_status='HELD_DIRECT' then v_status:='CONFIRMED';end if;
 elsif p_action='DEPOSIT_ACK' then
 if p_actor<>o.owner_id or o.status<>'PENDING_PAYMENT' or o.payment_status<>'PAID' or o.deposit_status<>'UNPAID' then raise exception 'INVALID_STATE';end if;
 update nk_orders set deposit_status='HELD_DIRECT' where id=o.id;v_status:='CONFIRMED';v_event:='DEPOSIT_UPDATED';
 elsif p_action='READY' then
 if p_actor<>o.owner_id or o.status<>'CONFIRMED' then raise exception 'INVALID_STATE';end if;v_status:='READY_FOR_HANDOVER';v_event:='HANDOVER_REMINDER';
 elsif p_action='REQUEST_RETURN' then
 if p_actor<>o.renter_id or o.status<>'ACTIVE' then raise exception 'INVALID_STATE';end if;v_status:='RETURN_PENDING';v_event:='RETURN_REMINDER';
 elsif p_action='ISSUE_OTP' then
 v_phase:=p_data->>'phase';
 if not((v_phase='PICKUP' and p_actor=o.owner_id and o.status='READY_FOR_HANDOVER') or (v_phase='RETURN' and p_actor=o.renter_id and o.status='RETURN_PENDING')) or o.dispute_status='DISPUTED' then raise exception 'INVALID_STATE';end if;
 select * into c from nk_handover_codes where order_id=o.id and phase=v_phase;
 if found and c.created_at>now()-interval '1 minute' then raise exception 'RATE_LIMITED';end if;
 insert into nk_handover_codes(order_id,phase,code_hash,issuer,expires_at) values(o.id,v_phase,p_data->>'codeHash',p_actor,now()+interval '5 minutes') on conflict(order_id,phase) do update set code_hash=excluded.code_hash,issuer=excluded.issuer,expires_at=excluded.expires_at,attempts=0,consumed_at=null,created_at=now();
 elsif p_action='HANDOVER' then
 v_phase:=p_data->>'phase';
 if not((v_phase='PICKUP' and o.status='READY_FOR_HANDOVER') or (v_phase='RETURN' and o.status='RETURN_PENDING')) or o.dispute_status='DISPUTED' then raise exception 'INVALID_STATE';end if;
 if p_data->>'checked'<>'true' or jsonb_typeof(p_data->'checklist')<>'array' or p_data->'checklist' is distinct from o.snapshot->'accessories' or jsonb_array_length(coalesce(p_data->'images','[]'))<1 or length(trim(coalesce(p_data->>'condition','')))<3 then raise exception 'CHECKLIST_REQUIRED';end if;
 select * into c from nk_handover_codes where order_id=o.id and phase=v_phase for update;
 if not found or c.expires_at<=now() or c.consumed_at is not null then return jsonb_build_object('error','OTP_INVALID');end if;
 if c.attempts>=5 then return jsonb_build_object('error','OTP_LOCKED');end if;
 if p_actor<>c.issuer and c.code_hash is distinct from p_data->>'codeHash' then update nk_handover_codes set attempts=attempts+1 where order_id=o.id and phase=v_phase;insert into nk_operations(actor_id,key,action,fingerprint,result) values(p_actor,p_key,p_action,coalesce(p_data->>'_requestHash',md5(p_data::text)),jsonb_build_object('error','OTP_INVALID'));return jsonb_build_object('error','OTP_INVALID');end if;
 insert into nk_handover_checks(order_id,phase,profile_id,checklist,images,condition) values(o.id,v_phase,p_actor,p_data->'checklist',p_data->'images',p_data->>'condition') on conflict do nothing;
 select count(*) into v_count from nk_handover_checks where order_id=o.id and phase=v_phase;
 if v_count=2 then update nk_handover_codes set consumed_at=now() where order_id=o.id and phase=v_phase;v_status:=case when v_phase='PICKUP' then 'ACTIVE' else 'COMPLETED' end;v_event:=case when v_phase='PICKUP' then 'HANDOVER_COMPLETED' else 'RETURN_CONFIRMED' end;end if;
 elsif p_action='EXTEND' then
 if p_actor<>o.renter_id or o.status<>'ACTIVE' or o.dispute_status='DISPUTED' then raise exception 'INVALID_STATE';end if;
 v_end:=(p_data->>'end')::timestamptz;if v_end<=o.ends_at or v_end>o.starts_at+interval '90 days' then raise exception 'INVALID_TIME';end if;
 if not nk_calendar_free(o.asset_id,o.starts_at,v_end,(o.snapshot->>'bufferMinutes')::integer,o.id) then raise exception 'SLOT_CONFLICT';end if;
 v_count:=ceil(extract(epoch from v_end-o.starts_at)/((o.snapshot->>'unitMinutes')::integer*60))-(o.snapshot->>'units')::integer;
 v_rent:=v_count*(o.snapshot->>'rate')::bigint;v_fee:=ceil(((o.snapshot->>'rent')::bigint+v_rent)*coalesce((o.snapshot->>'feeBps')::integer,0)::numeric/10000)-(o.snapshot->>'fee')::bigint;
 if (o.snapshot->>'total')::bigint+v_rent+v_fee>1000000000 then raise exception 'INVALID_INPUT';end if;
 insert into nk_extensions(order_id,ends_at,extra,extra_fee) values(o.id,v_end,v_rent+v_fee,v_fee) returning id into v_id;result:=jsonb_build_object('extensionId',v_id,'extra',v_rent+v_fee);v_id:=o.id;v_event:='EXTENSION_REQUESTED';
 elsif p_action in ('EXTENSION_ACCEPT','EXTENSION_REJECT','EXTENSION_PAID') then
 if p_actor<>o.owner_id or o.status<>'ACTIVE' or o.dispute_status='DISPUTED' then raise exception 'INVALID_STATE';end if;
 select * into x from nk_extensions where id=(p_data->>'extension')::uuid and order_id=o.id for update;if not found then raise exception 'NOT_FOUND';end if;
 if p_action='EXTENSION_REJECT' and x.status in ('PENDING','ACCEPTED') then update nk_extensions set status='REJECTED' where id=x.id;
 else
 if (p_action='EXTENSION_ACCEPT' and x.status<>'PENDING') or (p_action='EXTENSION_PAID' and x.status<>'ACCEPTED') then raise exception 'INVALID_STATE';end if;
 if not nk_calendar_free(o.asset_id,o.starts_at,x.ends_at,(o.snapshot->>'bufferMinutes')::integer,o.id) then raise exception 'SLOT_CONFLICT';end if;
 if p_action='EXTENSION_PAID' or x.extra=0 then
 update nk_orders set ends_at=x.ends_at,block_until=x.ends_at+make_interval(mins=>(snapshot->>'bufferMinutes')::integer),snapshot=snapshot||jsonb_build_object('units',ceil(extract(epoch from x.ends_at-starts_at)/((snapshot->>'unitMinutes')::integer*60)),'rent',(snapshot->>'rent')::bigint+x.extra-x.extra_fee,'fee',(snapshot->>'fee')::bigint+x.extra_fee,'total',(snapshot->>'total')::bigint+x.extra,'extensionFees',(coalesce(snapshot->>'extensionFees','0'))::bigint+x.extra) where id=o.id;
 update nk_extensions set status='APPLIED' where id=x.id;
 else update nk_extensions set status='ACCEPTED' where id=x.id;end if;end if;v_event:='EXTENSION_UPDATED';
 elsif p_action='ISSUE' then
 if o.status='DRAFT' or length(trim(coalesce(p_data->>'note','')))<10 then raise exception 'INVALID_INPUT';end if;
 if exists(select 1 from nk_disputes where order_id=o.id and profile_id=p_actor and status='OPEN') then raise exception 'INVALID_STATE';end if;
 if (select count(*) from nk_disputes where profile_id=p_actor and created_at>now()-interval '1 day')>=5 then raise exception 'RATE_LIMITED';end if;
 if exists(select 1 from nk_evidence where order_id=o.id and purge_state='PURGING') then raise exception 'RETRY_LATER';end if;
 update nk_evidence set expires_at=greatest(expires_at,now()+interval '90 days') where order_id=o.id;
 insert into nk_disputes(order_id,profile_id,note,images) values(o.id,p_actor,p_data->>'note',coalesce(p_data->'images','[]'));update nk_orders set dispute_status='DISPUTED' where id=o.id;v_event:='DISPUTE_UPDATED';
 elsif p_action='RESOLVE' then
 if not reloo_staff_permission(p_actor,'neighborhood.write') or o.dispute_status<>'DISPUTED' or length(trim(coalesce(p_data->>'reason','')))<10 then raise exception 'FORBIDDEN';end if;
 update nk_disputes set status='RESOLVED',resolution=p_data->>'reason' where order_id=o.id and status='OPEN';update nk_orders set dispute_status='RESOLVED' where id=o.id;v_event:='DISPUTE_UPDATED';
 elsif p_action in ('REFUND_REPORT','REFUND_ACK','DEPOSIT_RETURN','DEPOSIT_RETURN_ACK') then
 if p_action='REFUND_REPORT' and p_actor=o.owner_id and o.refund_status='REFUND_PENDING' then update nk_orders set refund_status='RETURN_REPORTED' where id=o.id;
 elsif p_action='REFUND_ACK' and p_actor=o.renter_id and o.refund_status='RETURN_REPORTED' then update nk_orders set refund_status='REFUNDED' where id=o.id;
 elsif p_action='DEPOSIT_RETURN' and p_actor=o.owner_id and o.deposit_status='HELD_DIRECT' and o.status in ('COMPLETED','CANCELLED') and o.dispute_status<>'DISPUTED' then update nk_orders set deposit_status='RETURN_REPORTED' where id=o.id;
 elsif p_action='DEPOSIT_RETURN_ACK' and p_actor=o.renter_id and o.deposit_status='RETURN_REPORTED' then update nk_orders set deposit_status='RETURNED' where id=o.id;
 else raise exception 'INVALID_STATE';end if;v_event:=case when p_action like 'REFUND_%' then 'REFUND_UPDATED' else 'DEPOSIT_UPDATED' end;
 elsif p_action='REVIEW' then
 if o.status<>'COMPLETED' then raise exception 'INVALID_STATE';end if;
 insert into nk_reviews(order_id,profile_id,rating,note) values(o.id,p_actor,(p_data->>'rating')::integer,left(p_data->>'note',1000));
 else raise exception 'INVALID_INPUT';end if;
 update nk_orders set status=v_status,version=version+1,updated_at=now() where id=o.id;
 insert into nk_order_events(order_id,actor_id,action,data,correlation_id) values(o.id,p_actor,p_action,jsonb_build_object('phase',v_phase,'reason',left(p_data->>'reason',1000),'status',v_status),p_key);
 if v_event is not null then perform nk_emit(v_event,o.id::text,o.owner_id,p_key);perform nk_emit(v_event,o.id::text,o.renter_id,p_key);end if;
 if v_status='CONFIRMED' and o.status<>'CONFIRMED' then perform nk_emit('ORDER_CONFIRMED',o.id::text,o.renter_id,p_key);end if;
 if v_status='COMPLETED' then perform nk_emit('REVIEW_INVITED',o.id::text,o.renter_id,p_key);if o.need_id is not null then update nk_needs set status='CLOSED' where id=o.need_id;end if;end if;
 result:=result||jsonb_build_object('id',o.id,'status',v_status);
 end if;
 q:=result;
 if p_action in ('ADMIN_PLACE','ADMIN_PLACE_REVIEW','ADMIN_LOCK','ADMIN_MERGE','ADMIN_CHANGE') then q:=result||jsonb_build_object('record',(select to_jsonb(record) from nk_places record where id=v_id));
 elsif p_action='ADMIN_VERIFY' then q:=result||jsonb_build_object('record',(select to_jsonb(record) from nk_memberships record where id=v_id));end if;
 insert into nk_audit(actor_id,resource_id,action,before_data,after_data,reason,correlation_id) values(p_actor,coalesce(v_id::text,p_data->>'asset',p_actor),p_action,case when p_action like 'ADMIN_%' then v_old else null end,q,left(p_data->>'reason',1000),p_key);
 insert into nk_operations(actor_id,key,action,fingerprint,result) values(p_actor,p_key,p_action,coalesce(p_data->>'_requestHash',md5(p_data::text)),result);return result;
end $$;

do $$declare f record;begin for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and (proname like 'nk\_%' escape '\' or proname like 'reloo_neighborhood_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end $$;
notify pgrst,'reload schema';
commit;
