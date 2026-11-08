begin;
create or replace function nk_location_residency_review() returns trigger language plpgsql set search_path=public as $$
declare m nk_memberships;correlation uuid:=coalesce(nullif(current_setting('reloo.neighborhood.correlation',true),'')::uuid,gen_random_uuid());
begin
 if new.kind='HANDOVER' or (new.parent_id is not distinct from old.parent_id and new.geometry is not distinct from old.geometry) then return new;end if;
 for m in select * from nk_memberships membership where membership.status in ('VERIFIED','PENDING')
 and (new.kind='AREA' and membership.area_id=new.id or new.kind='BUILDING' and membership.building_id=new.id or new.kind='SUBZONE' and exists(select 1 from nk_places b where b.id=membership.building_id and b.parent_id=new.id)) for update loop
 update nk_memberships set status='REVERIFY',verified_until=null,reason='LOCATION_DATA_CHANGED',updated_at=now() where id=m.id;
 perform nk_emit('RESIDENCY_UPDATED',m.id::text,m.profile_id,correlation);
 end loop;
 update nk_invites set expires_at=least(expires_at,now()) where (new.kind='AREA' and area_id=new.id) or (new.kind='BUILDING' and building_id=new.id);
 return new;
end $$;
drop trigger if exists nk_location_review on nk_places;
create trigger nk_location_review after update of parent_id,geometry on nk_places for each row execute function nk_location_residency_review();
revoke all on function nk_location_residency_review() from public,anon,authenticated;
grant execute on function nk_location_residency_review() to service_role;
commit;
