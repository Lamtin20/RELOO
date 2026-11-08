-- Full access is derived from the role, never from a wildcard assigned to an employee.
create table if not exists crm_mfa_sessions (
 id uuid primary key,profile_id text not null references profiles(id),auth_session_id uuid not null,factor_id uuid not null,
 created_at timestamptz not null default now(),expires_at timestamptz not null,revoked_at timestamptz,
 check(expires_at>created_at and expires_at<=created_at+interval '8 hours 1 minute')
);
alter table crm_mfa_sessions enable row level security;
revoke all on crm_mfa_sessions from public,anon,authenticated;
grant all on crm_mfa_sessions to service_role;
create index if not exists crm_mfa_active_profile on crm_mfa_sessions(profile_id) where revoked_at is null;
create or replace function reloo_revoke_changed_staff_sessions() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.role is distinct from old.role or new.permissions is distinct from old.permissions or new.enabled is distinct from old.enabled then update crm_mfa_sessions set revoked_at=now() where profile_id=new.profile_id and revoked_at is null;end if;return new;end $$;
drop trigger if exists crm_staff_sessions_changed on crm_staff;
create trigger crm_staff_sessions_changed after update on crm_staff for each row execute function reloo_revoke_changed_staff_sessions();
with previous as (select * from crm_staff), changed as (
 update crm_staff s set role=case when lower(s.role) in ('owner','admin') then lower(s.role) else 'staff' end,
 permissions=case when lower(s.role) in ('owner','admin') then array['*'] else array(select distinct p from unnest(s.permissions) p where p<>'*' and p<>'roles.write' order by p) end
 returning s.*
)
insert into security_audit(subject_id,action,details)
select c.profile_id,'CRM_LEGACY_PERMISSIONS_RESTRICTED',jsonb_build_object('previousRole',p.role,'previousPermissions',p.permissions,'role',c.role,'permissions',c.permissions)
from changed c join previous p using(profile_id) where c.role is distinct from p.role or c.permissions is distinct from p.permissions;
alter table crm_staff drop constraint if exists crm_staff_role_check;
alter table crm_staff add constraint crm_staff_role_check check(role in ('owner','admin','staff'));
alter table crm_staff drop constraint if exists crm_staff_wildcard_check;
alter table crm_staff add constraint crm_staff_wildcard_check check(role in ('owner','admin') or (not '*'=any(permissions) and not 'roles.write'=any(permissions)));
create or replace function reloo_staff_permission(p_actor text,p_permission text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from crm_staff where profile_id=p_actor and enabled and
 (role in ('owner','admin') or role='staff' and p_permission<>'roles.write' and
 (p_permission=any(permissions) or p_permission like '%.read' and replace(p_permission,'.read','.write')=any(permissions))));
$$;
create or replace function reloo_staff_set(p_actor text,p_target text,p_role text,p_permissions text[],p_enabled boolean,p_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
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
revoke all on function reloo_staff_permission(text,text),reloo_staff_set(text,text,text,text[],boolean,text) from public,anon,authenticated;
grant execute on function reloo_staff_permission(text,text),reloo_staff_set(text,text,text,text[],boolean,text) to service_role;
notify pgrst,'reload schema';
