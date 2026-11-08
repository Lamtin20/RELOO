create or replace function public.reloo_staff_set(p_actor text,p_target text,p_role text,p_permissions text[],p_enabled boolean,p_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old crm_staff;actual text[];allowed_permissions text[]:=array['control.read','crm.read','reports.read','traffic.read','customers.read','customers.write','orders.read','risk.read','risk.write','kyc.read','kyc.write','jobs.read','jobs.write','settings.read','settings.write','legal.read','legal.write','roles.read','neighborhood.read','neighborhood.write','tasks.read','tasks.write','opportunities.read','opportunities.write','promotions.read','promotions.write','content.read','content.write','support.read','support.write','callcenter.read','callcenter.write','personnel.read','personnel.write','accounting.read','accounting.write','tax.read','tax.write','affiliate.read','affiliate.write','bots.read','bots.write','neighborhood.verify','neighborhood.evidence','bots.publish','support.assign','support.contacts'];
begin
 perform pg_advisory_xact_lock(hashtext('crm-staff-administration'));
 if not exists(select 1 from crm_staff where profile_id=p_actor and enabled and role in ('owner','admin')) or p_actor=p_target then raise exception 'PERMISSION_REQUIRED';end if;
 if p_reason is null or length(trim(p_reason)) not between 20 and 2000 or not exists(select 1 from profiles where id=p_target and auth_user_id is not null and deleted_at is null) or p_enabled is null then raise exception 'INVALID_STAFF_ACCOUNT';end if;
 if p_role not in ('owner','admin','staff') or p_role is null or p_permissions is null or cardinality(p_permissions)>200 then raise exception 'INVALID_PERMISSIONS';end if;
 if p_role='staff' and exists(select 1 from unnest(p_permissions) p where p is null or p in ('*','roles.write') or not p=any(allowed_permissions)) then raise exception 'INVALID_PERMISSIONS';end if;
 select * into old from crm_staff where profile_id=p_target for update;
 if old.enabled and old.role in ('owner','admin') and (not p_enabled or p_role='staff') and not exists(select 1 from crm_staff where enabled and role in ('owner','admin') and profile_id<>p_target) then raise exception 'LAST_ADMIN_REQUIRED';end if;
 actual:=case when p_role in ('owner','admin') then array['*'] else array(select distinct p from unnest(p_permissions||array['crm.read']) p order by p) end;
 insert into crm_staff(profile_id,role,permissions,enabled) values(p_target,p_role,actual,p_enabled) on conflict(profile_id) do update set role=excluded.role,permissions=excluded.permissions,enabled=excluded.enabled;
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,p_target,'CRM_PERMISSIONS_CHANGED',jsonb_build_object('previousRole',old.role,'previousPermissions',old.permissions,'previousEnabled',old.enabled,'role',p_role,'permissions',actual,'enabled',p_enabled,'reason',p_reason));
end $$;
REVOKE ALL ON FUNCTION public.reloo_staff_set(text,text,text,text[],boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_staff_set(text,text,text,text[],boolean,text) TO service_role;
