begin;
alter table public.stay_blocks add column source text not null default 'MAINTENANCE';
alter table public.stay_blocks add column external_ref text;
alter table public.stay_blocks add column external_amount bigint check(external_amount>=0);
alter table public.stay_blocks add column occupied_until timestamptz;
create unique index stay_external_identity on public.stay_blocks(unit_id,source,external_ref) where external_ref is not null;
create function public.reloo_stay_host(p_actor uuid,p_op text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r stay_room_types;p stay_properties;uid uuid; a timestamptz;b timestamptz;stop_at timestamptz;item jsonb;ref text;src text;clean integer;result jsonb;
begin
 if p_actor is null then raise exception 'AUTH_REQUIRED'; end if;
 uid=(p_input->>'unitId')::uuid;
 select rt.* into r from stay_room_types rt join stay_units u on u.room_type_id=rt.id where u.id=uid for update of rt;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into p from stay_properties where id=r.property_id;
 if p.owner_id<>p_actor and not exists(select 1 from stay_memberships where property_id=p.id and actor_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if not p.demo then raise exception 'DEMO_ONLY'; end if;
 if p_op='calendar' then
  return jsonb_build_object('orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'source','RELOO','status',status,'startsAt',starts_at,'endsAt',ends_at,'blockedUntil',blocked_until)) from stay_orders where unit_id=uid and (status in ('CONFIRMED','CHECKED_IN') or status='HELD' and hold_until>now())),'[]'),
   'blocks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'source',source,'externalRef',external_ref,'startsAt',starts_at,'endsAt',coalesce(occupied_until,ends_at),'blockedUntil',ends_at,'reason',reason,'externalAmount',external_amount)) from stay_blocks where unit_id=uid),'[]'));
 elsif p_op='cleaning-buffer' then
  clean=(p_input->>'minutes')::integer;
  if clean is null or clean not between 0 and 1440 then raise exception 'INVALID_INPUT'; end if;
  -- Do not silently move occupancy boundaries underneath existing reservations.
  if exists(select 1 from stay_orders so join stay_units u on u.id=so.unit_id where u.room_type_id=r.id and so.status in ('HELD','CONFIRMED','CHECKED_IN') and so.blocked_until>now()) or exists(select 1 from stay_blocks bl join stay_units u on u.id=bl.unit_id where u.room_type_id=r.id and bl.ends_at>now()) then raise exception 'ACTIVE_INVENTORY'; end if;
  update stay_room_types set cleaning_minutes=clean,version=version+1 where id=r.id;
 elsif p_op in ('external-reservation','ical-apply') then
  src=trim(p_input->>'source');
  if src is null or length(src) not between 2 and 60 or src in ('RELOO','MAINTENANCE') then raise exception 'INVALID_SOURCE'; end if;
  if p_op='external-reservation' then result=jsonb_build_array(p_input);
  else
   result=p_input->'events';
   if jsonb_typeof(result) is distinct from 'array' or jsonb_array_length(result)>100 then raise exception 'INVALID_INPUT'; end if;
  end if;
  for item in select value from jsonb_array_elements(result) loop
   ref=trim(item->>'uid');if ref is null or length(ref) not between 1 and 200 then raise exception 'INVALID_REFERENCE'; end if;
   if item->>'cancelled'='true' then
    delete from stay_blocks where unit_id=uid and source=src and external_ref=ref;
    continue;
   end if;
   a=(item->>'startsAt')::timestamptz;b=(item->>'endsAt')::timestamptz;stop_at=b+make_interval(mins=>r.cleaning_minutes);
   if a is null or b is null or b<=a or b>a+interval '366 days' then raise exception 'INVALID_TIME'; end if;
   if exists(select 1 from stay_orders where unit_id=uid and (status in ('CONFIRMED','CHECKED_IN') or status='HELD' and hold_until>now()) and starts_at<stop_at and blocked_until>a)
    or exists(select 1 from stay_blocks where unit_id=uid and not (source=src and external_ref is not distinct from ref) and starts_at<stop_at and ends_at>a) then raise exception 'SLOT_CONFLICT'; end if;
   insert into stay_blocks(unit_id,starts_at,ends_at,reason,source,external_ref,external_amount,occupied_until)
    values(uid,a,stop_at,case when p_op='ical-apply' then 'Imported availability · demo' else 'External reservation · demo' end,src,ref,case when p_op='external-reservation' then (item->>'amount')::bigint else null end,b)
    on conflict(unit_id,source,external_ref) where external_ref is not null do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,occupied_until=excluded.occupied_until,external_amount=excluded.external_amount;
  end loop;
 else raise exception 'INVALID_OPERATION'; end if;
 insert into stay_management_audit(actor_id,property_id,event,detail) values(p_actor,p.id,p_op,jsonb_build_object('unitId',uid,'source',src));
 return jsonb_build_object('ok',true,'demo',true);
end$$;
revoke all on function public.reloo_stay_host(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_stay_host(uuid,text,jsonb) to service_role;
commit;
