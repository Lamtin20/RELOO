create or replace function pg_temp.reloo_bootstrap_owner(p_email text) returns void language plpgsql as $$
declare owner_profile text;
begin
  if exists(select 1 from public.crm_staff) then raise exception 'OWNER_ALREADY_BOOTSTRAPPED'; end if;
  select p.id into owner_profile from public.profiles p join auth.users u on u.id=p.auth_user_id where lower(u.email)=lower(p_email) and u.email_confirmed_at is not null;
  if owner_profile is null then raise exception 'VERIFIED_OWNER_ACCOUNT_REQUIRED'; end if;
  insert into public.crm_staff(profile_id,role,permissions) values(owner_profile,'owner',array['*']);
  insert into public.security_audit(actor_id,subject_id,action,details) values(owner_profile,owner_profile,'CRM_OWNER_BOOTSTRAPPED','{"basis":"Verified existing Google project-owner account; customer activation preserved"}');
end $$;
select pg_temp.reloo_bootstrap_owner(:'owner_email');
