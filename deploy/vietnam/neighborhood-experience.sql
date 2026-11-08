-- Additive UI support. Apply after neighborhood-functions.sql, then security-lockdown.sql.
begin;
create table if not exists nk_home_preferences(
 profile_id text primary key references profiles(id),choice text not null check(choice in ('YES','NO','LATER')),
 area_id uuid references nk_places(id),building_id uuid references nk_places(id),pending_building_id uuid references nk_places(id),
 public_building boolean not null default false,updated_at timestamptz not null default now(),
 check(choice='YES' or (area_id is null and building_id is null and pending_building_id is null))
);
alter table nk_home_preferences enable row level security;
create or replace function reloo_home_preference(p_actor text,p_key uuid default null,p_data jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare home nk_home_preferences;area uuid;building uuid;pending uuid;prior nk_operations;answer jsonb;fingerprint text;
begin
 if p_actor is null or not exists(select 1 from profiles where id=p_actor and deleted_at is null) then raise exception 'FORBIDDEN';end if;
 if p_data is null then return coalesce((select to_jsonb(h)-'profile_id' from nk_home_preferences h where profile_id=p_actor),'{}');end if;
 if p_key is null or jsonb_typeof(p_data)<>'object' or coalesce(p_data->>'choice','') not in ('YES','NO','LATER') then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended('nk-home:'||p_actor,0));fingerprint:=md5(p_data::text);
 select * into prior from nk_operations where actor_id=p_actor and key=p_key;
 if found then if prior.action<>'HOME_PREFERENCE' or prior.fingerprint<>fingerprint then raise exception 'REQUEST_CONFLICT';end if;return prior.result;end if;
 if (select count(*) from nk_operations where actor_id=p_actor and action='HOME_PREFERENCE' and created_at>now()-interval '1 day')>=20 then raise exception 'RATE_LIMITED';end if;
 select * into home from nk_home_preferences where profile_id=p_actor for update;
 if p_data->>'choice'='YES' then
  area:=nullif(p_data->>'area','')::uuid;building:=nullif(p_data->>'building','')::uuid;
  if not exists(select 1 from nk_places where id=area and kind='AREA' and status='ACTIVE' and merged_into is null) then raise exception 'INVALID_INPUT';end if;
  if building is not null and not exists(select 1 from nk_places where id=building and kind='BUILDING' and status='ACTIVE' and merged_into is null and nk_area(id)=area) then raise exception 'INVALID_INPUT';end if;
  if building is null and length(trim(coalesce(p_data->>'buildingText','')))>0 then
   if length(trim(p_data->>'buildingText')) not between 2 and 100 then raise exception 'INVALID_INPUT';end if;
   select id into pending from nk_places where kind='BUILDING' and parent_id=area and lower(trim(name))=lower(trim(p_data->>'buildingText')) and status='PENDING' limit 1;
   if pending is null then insert into nk_places(kind,parent_id,name,source_id,status) values('BUILDING',area,trim(p_data->>'buildingText'),'00000000-0000-4000-8000-000000000001','PENDING') returning id into pending;end if;
  end if;
  perform reloo_neighborhood_action(p_actor,p_key,'MEMBERSHIP',jsonb_build_object('area',area,'building',coalesce(building::text,''),'visible',coalesce((p_data->>'visible')::boolean,false)));
  update nk_memberships set status='SELECTED',reason=null,verified_until=null where profile_id=p_actor and area_id=area and status='REVOKED' and reason='SELF_WITHDRAWN';
  if pending is not null then update nk_memberships set status=case when status in ('VERIFIED','PENDING') then 'REVERIFY' else status end,verified_until=null where profile_id=p_actor and area_id=area;end if;
 end if;
 if home.area_id is not null and (area is distinct from home.area_id or p_data->>'choice'<>'YES') then
  update nk_memberships set status='REVOKED',verified_until=null,public_building=false,reason='SELF_WITHDRAWN',updated_at=now() where profile_id=p_actor and area_id=home.area_id;
 end if;
 if p_data->>'choice'<>'YES' then update nk_memberships set status='REVOKED',verified_until=null,public_building=false,reason='SELF_WITHDRAWN',updated_at=now() where profile_id=p_actor and status<>'REVOKED';end if;
 insert into nk_home_preferences(profile_id,choice,area_id,building_id,pending_building_id,public_building) values(p_actor,p_data->>'choice',area,building,pending,coalesce((p_data->>'visible')::boolean,false)) on conflict(profile_id) do update set choice=excluded.choice,area_id=excluded.area_id,building_id=excluded.building_id,pending_building_id=excluded.pending_building_id,public_building=excluded.public_building,updated_at=now();
 answer:=(select to_jsonb(h)-'profile_id' from nk_home_preferences h where profile_id=p_actor);
 -- MEMBERSHIP used the same idempotency key inside this transaction; replace its receipt.
 insert into nk_operations(actor_id,key,action,fingerprint,result) values(p_actor,p_key,'HOME_PREFERENCE',fingerprint,answer) on conflict(actor_id,key) do update set action=excluded.action,fingerprint=excluded.fingerprint,result=excluded.result;
 insert into nk_audit(actor_id,resource_id,action,correlation_id) values(p_actor,p_actor,'HOME_PREFERENCE',p_key);
 return answer;
end $$;
create or replace function reloo_neighborhood_quote_context(p_actor text,p_asset text) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not nk_eligible(p_actor,p_asset) then raise exception 'RESIDENCY_REQUIRED';end if;
 return (select jsonb_build_object('instant',l.instant,'ownerName',p.name) from nk_listings l join profiles p on p.id=l.owner_id where l.asset_id=p_asset and l.status='ACTIVE');
end $$;
revoke all on nk_home_preferences from public,anon,authenticated;
revoke all on function reloo_home_preference(text,uuid,jsonb),reloo_neighborhood_quote_context(text,text) from public,anon,authenticated;
grant all on nk_home_preferences to service_role;
grant execute on function reloo_home_preference(text,uuid,jsonb),reloo_neighborhood_quote_context(text,text) to service_role;
commit;
