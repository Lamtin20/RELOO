begin;
create table public.stay_management_audit(id bigint generated always as identity primary key,actor_id uuid not null,property_id uuid not null references public.stay_properties(id),event text not null,detail jsonb not null,created_at timestamptz not null default now());
create trigger stay_management_immutable before update or delete on public.stay_management_audit for each row execute function public.stay_audit_immutable();
alter table public.stay_management_audit enable row level security;
revoke all on public.stay_management_audit from public,anon,authenticated;
revoke all on sequence public.stay_management_audit_id_seq from public,anon,authenticated;
grant all on public.stay_management_audit to service_role;
grant usage,select on sequence public.stay_management_audit_id_seq to service_role;
create function public.reloo_stay_manage(p_actor uuid,p_admin boolean,p_op text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p stay_properties; r stay_room_types; v uuid; a timestamptz; b timestamptz; amount bigint; result jsonb;
begin
 if p_actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_op='workspace' then
  return jsonb_build_object('properties',coalesce((select jsonb_agg(to_jsonb(s)) from stay_properties s where p_admin or s.owner_id=p_actor or exists(select 1 from stay_memberships m where m.property_id=s.id and m.actor_id=p_actor)),'[]'),
   'rooms',coalesce((select jsonb_agg(to_jsonb(rt)||jsonb_build_object('units',(select jsonb_agg(to_jsonb(u)) from stay_units u where u.room_type_id=rt.id))) from stay_room_types rt join stay_properties sp on sp.id=rt.property_id where p_admin or sp.owner_id=p_actor or exists(select 1 from stay_memberships m where m.property_id=sp.id and m.actor_id=p_actor)),'[]'),
   'blocks',coalesce((select jsonb_agg(to_jsonb(bl)) from stay_blocks bl join stay_units u on u.id=bl.unit_id join stay_room_types rt on rt.id=u.room_type_id join stay_properties sp on sp.id=rt.property_id where p_admin or sp.owner_id=p_actor or exists(select 1 from stay_memberships m where m.property_id=sp.id and m.actor_id=p_actor)),'[]'),
   'audit',coalesce((select jsonb_agg(to_jsonb(au)) from stay_management_audit au join stay_properties sp on sp.id=au.property_id where p_admin or sp.owner_id=p_actor or exists(select 1 from stay_memberships m where m.property_id=sp.id and m.actor_id=p_actor)),'[]'));
 end if;
 if p_op='create-property' then
  if length(trim(coalesce(p_input->>'name','')))<3 or length(coalesce(p_input->>'name',''))>100 or length(trim(coalesce(p_input->>'city','')))<2 then raise exception 'INVALID_INPUT'; end if;
  insert into stay_properties(id,owner_id,name,city,address) values(gen_random_uuid(),p_actor,trim(p_input->>'name'),left(p_input->>'city',100),left(coalesce(p_input->>'address','Demo'),200)) returning * into p;
  insert into stay_memberships values(p.id,p_actor);
 else
  select * into p from stay_properties where id=(p_input->>'propertyId')::uuid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not p_admin and p.owner_id<>p_actor and not exists(select 1 from stay_memberships where property_id=p.id and actor_id=p_actor) then raise exception 'FORBIDDEN'; end if;
  if p_op='submit' then
   if p.status not in ('DRAFT','SUSPENDED') then raise exception 'INVALID_STATE'; end if;
   update stay_properties set status='PENDING' where id=p.id;
  elsif p_op='approve' then
   if not p_admin then raise exception 'FORBIDDEN'; end if;
   if p.status<>'PENDING' then raise exception 'INVALID_STATE'; end if;
   if not exists(select 1 from stay_room_types where property_id=p.id) then raise exception 'NO_ROOMS'; end if;
   update stay_properties set status='APPROVED' where id=p.id;
  elsif p_op='suspend' then update stay_properties set status='SUSPENDED' where id=p.id;
  elsif p_op='create-room' then
   amount=(p_input->>'nightlyPrice')::bigint;
   if amount is null or amount<1000 or amount>100000000 or coalesce((p_input->>'capacity')::integer,0) not between 1 and 20 or length(trim(coalesce(p_input->>'name','')))<3 then raise exception 'INVALID_INPUT'; end if;
   v=gen_random_uuid();
   insert into stay_room_types(id,property_id,name,capacity,nightly_price,policy,enabled) values(v,p.id,left(p_input->>'name',100),(p_input->>'capacity')::integer,amount,'{"id":"DEMO_FLEX","demo":true,"refundBeforeCheckin":100}',true);
   insert into stay_units values(gen_random_uuid(),v,'DEMO-01',true);
  elsif p_op in ('price','block','unblock','add-unit') then
   select * into r from stay_room_types where id=(p_input->>'roomTypeId')::uuid and property_id=p.id for update;
   if not found then raise exception 'NOT_FOUND'; end if;
   if p_op='price' then
    amount=(p_input->>'nightlyPrice')::bigint;
    if amount is null or amount<1000 or amount>100000000 then raise exception 'INVALID_INPUT'; end if;
    update stay_room_types set nightly_price=amount,version=version+1 where id=r.id;
   elsif p_op='add-unit' then
    if length(trim(coalesce(p_input->>'name','')))<1 then raise exception 'INVALID_INPUT'; end if;
    insert into stay_units values(gen_random_uuid(),r.id,left(p_input->>'name',50),true);
   elsif p_op='block' then
    a=(p_input->>'startsAt')::timestamptz;b=(p_input->>'endsAt')::timestamptz;
    v=(p_input->>'unitId')::uuid;
    if a is null or b is null or b<=a or length(trim(coalesce(p_input->>'reason','')))<3 then raise exception 'INVALID_INPUT'; end if;
    if not exists(select 1 from stay_units where id=v and room_type_id=r.id) then raise exception 'FORBIDDEN'; end if;
    if exists(select 1 from stay_orders where unit_id=v and status in ('HELD','CONFIRMED','CHECKED_IN') and (status<>'HELD' or hold_until>now()) and starts_at<b and blocked_until>a) then raise exception 'SLOT_CONFLICT'; end if;
    insert into stay_blocks(unit_id,starts_at,ends_at,reason) values(v,a,b,left(p_input->>'reason',300));
   else
    delete from stay_blocks where id=(p_input->>'blockId')::uuid and unit_id in(select id from stay_units where room_type_id=r.id);
    if not found then raise exception 'NOT_FOUND'; end if;
   end if;
  else raise exception 'INVALID_OPERATION'; end if;
 end if;
 insert into stay_management_audit(actor_id,property_id,event,detail) values(p_actor,p.id,p_op,p_input);
 select to_jsonb(sp) into result from stay_properties sp where id=p.id;
 return result;
end$$;
revoke all on function public.reloo_stay_manage(uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_stay_manage(uuid,boolean,text,jsonb) to service_role;
commit;
