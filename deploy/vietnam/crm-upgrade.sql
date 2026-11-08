create table if not exists public.media_assets(id uuid primary key,filename text not null unique,mime text not null,width integer not null,height integer not null,bytes integer not null,purpose text not null,created_by text references profiles(id),created_at timestamptz not null default now());
create table if not exists public.brand_settings(id boolean primary key default true check(id),favicon_id uuid references media_assets(id),app_icon_id uuid references media_assets(id),crm_logo_id uuid references media_assets(id),version integer not null default 1,updated_at timestamptz default now());
insert into public.brand_settings(id) values(true) on conflict do nothing;
create table if not exists public.news_articles(id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,excerpt text not null default '',body text not null default '',cover_id uuid references media_assets(id),cover_alt text not null default '',seo_title text not null default '',seo_description text not null default '',author_name text not null default 'RELOO',category text not null default 'Cẩm nang',tags text[] not null default '{}',status text not null default 'DRAFT' check(status in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED')),publish_at timestamptz,version integer not null default 1,created_by text references profiles(id),created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.banner_campaigns(id uuid primary key default gen_random_uuid(),title text not null,placement text not null,desktop_id uuid not null references media_assets(id),mobile_id uuid not null references media_assets(id),alt text not null,href text not null,starts_at timestamptz,ends_at timestamptz,priority integer not null default 0,status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED','ARCHIVED')),version integer not null default 1,created_by text references profiles(id),updated_at timestamptz default now(),check(ends_at is null or starts_at is null or ends_at>starts_at));
create table if not exists public.customer_changes(id uuid primary key default gen_random_uuid(),profile_id text not null references profiles(id),actor_id text not null references profiles(id),reason text not null,fields text[] not null,changes_encrypted text not null,created_at timestamptz default now());
do $$ declare t text;begin foreach t in array array['media_assets','brand_settings','news_articles','banner_campaigns','customer_changes'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
create or replace function public.reloo_customer_admin(p_actor text) returns boolean language sql security definer set search_path=public as $$
select exists(select 1 from crm_staff where profile_id=p_actor and enabled and role in ('owner','admin')) or exists(select 1 from profiles where id=p_actor and role='admin');
$$;
revoke all on function public.reloo_customer_admin(text) from public,anon,authenticated;
grant execute on function public.reloo_customer_admin(text) to service_role;
create or replace function public.reloo_phone_immutable() returns trigger language plpgsql as $$
declare editor text;
begin
  if nullif(old.phone,'') is not null and new.phone is distinct from old.phone then
    editor=current_setting('reloo.customer_editor',true);
    if editor is null or not reloo_customer_admin(editor) or not reloo_staff_permission(editor,'customers.write') then raise exception 'REGISTERED_PHONE_IMMUTABLE';end if;
  end if;return new;
end $$;
create or replace function public.reloo_edit_customer(p_actor text,p_profile text,p_updates jsonb,p_reason text,p_changes text,p_expected jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
  if not reloo_customer_admin(p_actor) or not reloo_staff_permission(p_actor,'customers.write') then raise exception 'ADMIN_REQUIRED';end if;
  if length(trim(p_reason))<20 or length(p_changes)<20 or exists(select 1 from jsonb_object_keys(p_updates) k where k not in ('name','phone','bio','address','dateOfBirth','gender')) then raise exception 'INVALID_EDIT';end if;
  perform 1 from profiles where id=p_profile for update;if not found then raise exception 'CUSTOMER_REQUIRED';end if;
  if (select jsonb_build_object('name',name,'phone',phone,'profile_data',profile_data) from profiles where id=p_profile) is distinct from p_expected then raise exception 'CUSTOMER_VERSION_CONFLICT';end if;
  perform set_config('reloo.customer_editor',p_actor,true);
  if p_updates ? 'phone' and p_updates->>'phone' is distinct from (select phone from profiles where id=p_profile) then
    update profiles set activation_status=case when activation_status='RESTRICTED' then 'RESTRICTED' else 'PENDING' end,screening_valid_until=null,phone_screening_status='UNKNOWN' where id=p_profile;
    insert into automation_jobs(kind,payload,created_by) values('CHECK_CURRENT_PHONE',jsonb_build_object('profileId',p_profile),p_actor);
  end if;
  update profiles set name=coalesce(p_updates->>'name',name),phone=coalesce(p_updates->>'phone',phone),profile_data=coalesce(profile_data,'{}')||(p_updates-'name'-'phone') where id=p_profile;
  perform set_config('reloo.customer_editor','',true);
  insert into customer_changes(profile_id,actor_id,reason,fields,changes_encrypted) values(p_profile,p_actor,p_reason,array(select jsonb_object_keys(p_updates)),p_changes);
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,p_profile,'CUSTOMER_EDITED',jsonb_build_object('reason',p_reason,'fields',array(select jsonb_object_keys(p_updates))));
end $$;
create or replace function public.reloo_customer_group(p_actor text,p_profile text,p_group text,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not reloo_customer_admin(p_actor) or not reloo_staff_permission(p_actor,'risk.write') then raise exception 'ADMIN_REQUIRED';end if;
  if p_profile=p_actor or p_group not in ('BLACKLIST','NORMAL') or length(trim(p_reason))<20 then raise exception 'INVALID_GROUP';end if;
  perform 1 from profiles where id=p_profile for update;if not found then raise exception 'CUSTOMER_REQUIRED';end if;
  if p_group='BLACKLIST' then
    insert into risk_blacklist(profile_id,kind,reason,status,reviewed_by,evidence) values(p_profile,'ACCOUNT',p_reason,'CONFIRMED',p_actor,jsonb_build_array(jsonb_build_object('source','admin_review','note',p_reason)));
    update profiles set activation_status='RESTRICTED',screening_valid_until=null where id=p_profile;
  else
    update risk_blacklist set status='CLEARED',reviewed_by=p_actor,reason=p_reason,updated_at=now() where profile_id=p_profile and status<>'CLEARED';
    update risk_cases set status='CLEARED',reviewed_by=p_actor,updated_at=now() where profile_id=p_profile and status<>'CLEARED';
    update scoped_ip_signals set expires_at=now() where profile_id=p_profile and expires_at>now();
    update profiles set activation_status='ACTIVE',screening_valid_until=now()+interval '30 days',verification_method='ADMIN_REVIEW' where id=p_profile;
  end if;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,p_profile,'CUSTOMER_GROUP_'||p_group,jsonb_build_object('reason',p_reason));
end $$;
create or replace function public.reloo_identity_notices() returns void language plpgsql security definer set search_path=public as $$
begin
  insert into security_audit(subject_id,action,details)
  select profile_id,case when expires_at<=now() then 'IDENTITY_EXPIRED' else 'IDENTITY_EXPIRING' end,jsonb_build_object('id',submission_id,'expiresAt',expires_at)
  from verified_identities where expires_at is not null and expires_at<=now()+interval '30 days'
  and not exists(select 1 from security_audit where subject_id=verified_identities.profile_id and details->>'id'=verified_identities.submission_id::text and action=case when verified_identities.expires_at<=now() then 'IDENTITY_EXPIRED' else 'IDENTITY_EXPIRING' end);
end $$;
revoke all on function public.reloo_edit_customer(text,text,jsonb,text,text,jsonb),public.reloo_customer_group(text,text,text,text),public.reloo_identity_notices() from public,anon,authenticated;
grant execute on function public.reloo_edit_customer(text,text,jsonb,text,text,jsonb),public.reloo_customer_group(text,text,text,text),public.reloo_identity_notices() to service_role;
create or replace function public.reloo_expired_identity_guard() returns trigger language plpgsql as $$
declare subject text;
begin
  if tg_table_name='rental_agreements' then
    if exists(select 1 from verified_identities where profile_id in (new.lender_id,new.renter_id) and expires_at<=now()) then raise exception 'IDENTITY_EXPIRED';end if;
  end if;return new;
end $$;
drop trigger if exists rental_identity_expiry on public.rental_agreements;
create trigger rental_identity_expiry before insert or update of status on public.rental_agreements for each row execute function public.reloo_expired_identity_guard();
create or replace function public.reloo_assert_active(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from verified_identities where profile_id=p_profile_id and expires_at<=now()) then raise exception 'IDENTITY_EXPIRED' using errcode='42501';end if;
  if not exists(select 1 from profiles where id=p_profile_id and status='active' and activation_status='ACTIVE' and screening_valid_until>now() and reloo_normalize_phone(phone) is not null)
    or exists(select 1 from risk_cases where profile_id=p_profile_id and status<>'CLEARED')
    or exists(select 1 from risk_blacklist where profile_id=p_profile_id and status<>'CLEARED' and (expires_at is null or expires_at>now())) then raise exception 'ACCOUNT_RESTRICTED' using errcode='42501';end if;
end $$;
revoke all on function public.reloo_assert_active(text) from public,anon,authenticated;
grant execute on function public.reloo_assert_active(text) to service_role;
notify pgrst,'reload schema';
