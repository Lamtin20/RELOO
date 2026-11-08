create table if not exists public.business_settings (
  id boolean primary key default true check(id), version integer not null default 1,
  entity jsonb not null default '{}', deposit jsonb not null default '{"enabled":false,"mode":"OPTIONAL"}',
  updated_by text references public.profiles(id), updated_at timestamptz not null default now()
);
insert into public.business_settings(id) values(true) on conflict do nothing;
create table if not exists public.integration_settings (
  provider text primary key check(provider in ('VNPT','SEPAY','EVM','TWENTY')),
  config jsonb not null default '{}', secrets_encrypted text,
  version integer not null default 1, updated_by text references public.profiles(id), updated_at timestamptz not null default now()
);
alter table public.integration_settings add column if not exists health jsonb not null default '{}';
create table if not exists public.profile_bank_accounts (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  bank_code text not null, bank_bin text not null, bank_name text not null, logo text,
  account_encrypted text not null, account_hash text not null, masked_account text not null,
  holder_encrypted text not null, holder_name_hash text not null, branch_encrypted text,
  name_status text not null check(name_status in ('WAIT_ID','DECLARED_NAME_MATCH')),
  is_default boolean not null default false, consent_at timestamptz not null,
  created_at timestamptz not null default now(), unique(profile_id,bank_bin,account_hash)
);
create unique index if not exists bank_one_default on public.profile_bank_accounts(profile_id) where is_default;
create table if not exists public.verified_identities (
  profile_id text primary key references public.profiles(id), submission_id uuid not null references public.kyc_submissions(id),
  fields_encrypted text not null, holder_name_hash text not null, verified_at timestamptz not null default now(), expires_at timestamptz
);
alter table public.verified_identities add column if not exists national_id_hash text;
create unique index if not exists verified_identity_one_number on public.verified_identities(national_id_hash) where national_id_hash is not null;
create table if not exists public.kyc_challenges (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  poses jsonb not null, issued_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '5 minutes', consumed_at timestamptz
);
alter table public.kyc_submissions add column if not exists challenge_id uuid references public.kyc_challenges(id);
alter table public.kyc_submissions add column if not exists provider text;
alter table public.kyc_submissions add column if not exists checks jsonb;
alter table public.kyc_submissions add column if not exists confirmation_at timestamptz;
create unique index if not exists kyc_unique_video on public.kyc_submissions((document_paths->>'videoHash')) where document_paths->>'videoHash' is not null;
drop index if exists public.kyc_one_pending;
create unique index if not exists kyc_one_processing on public.kyc_submissions(profile_id) where status in ('QUEUED','PROCESSING');
do $$ declare t text; begin
  foreach t in array array['business_settings','integration_settings','profile_bank_accounts','verified_identities','kyc_challenges'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
create or replace function public.reloo_phone_immutable() returns trigger language plpgsql as $$
begin
  if nullif(old.phone,'') is not null and new.phone is distinct from old.phone then raise exception 'REGISTERED_PHONE_IMMUTABLE'; end if;
  return new;
end $$;
drop trigger if exists reloo_phone_immutable on public.profiles;
create trigger reloo_phone_immutable before update of phone on public.profiles for each row execute function public.reloo_phone_immutable();
create or replace function public.reloo_profile_update(p_profile text,p_updates jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from profiles where id=p_profile for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') or exists(select 1 from risk_blacklist where profile_id=p_profile and status<>'CLEARED' and (expires_at is null or expires_at>now())) then raise exception 'ACCOUNT_RESTRICTED'; end if;
  if exists(select 1 from jsonb_object_keys(p_updates) k where k not in ('name','bio','address','addressDetails')) then raise exception 'IMMUTABLE_OR_UNKNOWN_FIELD'; end if;
  if length(coalesce(p_updates->>'name',''))>100 or length(coalesce(p_updates->>'bio',''))>1500 or length(coalesce(p_updates->>'address',''))>500 or octet_length(coalesce(p_updates->'addressDetails','{}')::text)>3000 then raise exception 'INVALID_PROFILE'; end if;
  update profiles set name=coalesce(nullif(p_updates->>'name',''),name),profile_data=coalesce(profile_data,'{}')||p_updates where id=p_profile;
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'PROFILE_UPDATED',jsonb_build_object('fields',(select jsonb_agg(key) from jsonb_object_keys(p_updates) key)));
end $$;
create or replace function public.reloo_save_bank(p_profile text,p_data jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; identity verified_identities;
begin
  perform 1 from profiles where id=p_profile for update;
  if not found or exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') or exists(select 1 from risk_blacklist where profile_id=p_profile and status<>'CLEARED' and (expires_at is null or expires_at>now())) then raise exception 'ACCOUNT_RESTRICTED'; end if;
  select * into identity from verified_identities where profile_id=p_profile and (expires_at is null or expires_at>now());
  if found and identity.holder_name_hash<>p_data->>'holder_name_hash' then raise exception 'HOLDER_ID_MISMATCH'; end if;
  if p_data->>'bank_bin'!~'^\d{6}$' or p_data->>'account_hash'!~'^[a-f0-9]{64}$' or p_data->>'holder_name_hash'!~'^[a-f0-9]{64}$' or length(p_data->>'account_encrypted')<20 or length(p_data->>'holder_encrypted')<20 then raise exception 'INVALID_BANK'; end if;
  if (p_data->>'is_default')::boolean then update profile_bank_accounts set is_default=false where profile_id=p_profile; end if;
  insert into profile_bank_accounts(profile_id,bank_code,bank_bin,bank_name,logo,account_encrypted,account_hash,masked_account,holder_encrypted,holder_name_hash,branch_encrypted,name_status,is_default,consent_at)
  values(p_profile,p_data->>'bank_code',p_data->>'bank_bin',p_data->>'bank_name',p_data->>'logo',p_data->>'account_encrypted',p_data->>'account_hash',p_data->>'masked_account',p_data->>'holder_encrypted',p_data->>'holder_name_hash',p_data->>'branch_encrypted',case when identity.profile_id is null then 'WAIT_ID' else 'DECLARED_NAME_MATCH' end,(p_data->>'is_default')::boolean,now())
  on conflict(profile_id,bank_bin,account_hash) do update set holder_encrypted=excluded.holder_encrypted,holder_name_hash=excluded.holder_name_hash,branch_encrypted=excluded.branch_encrypted,name_status=excluded.name_status,is_default=excluded.is_default returning id into v_id;
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'BANK_DECLARED',jsonb_build_object('id',v_id,'bank',p_data->>'bank_code'));
  return v_id;
end $$;
create or replace function public.reloo_queue_kyc(p_profile text,p_id uuid,p_national text,p_hash text,p_paths jsonb,p_challenge uuid) returns void
language plpgsql security definer set search_path=public as $$
declare c kyc_challenges;
begin
  perform 1 from profiles where id=p_profile for update;
  if not found or exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') then raise exception 'ACCOUNT_RESTRICTED'; end if;
  if p_challenge is not null then
    select * into c from kyc_challenges where id=p_challenge and profile_id=p_profile and consumed_at is null and expires_at>now() for update;
    if not found then raise exception 'CHALLENGE_EXPIRED'; end if;
    update kyc_challenges set consumed_at=now() where id=p_challenge;
  end if;
  insert into kyc_submissions(id,profile_id,national_id_encrypted,national_id_hash,document_paths,challenge_id,consent_at) values(p_id,p_profile,p_national,p_hash,p_paths,p_challenge,now());
  insert into automation_jobs(kind,payload,created_by) values('KYC_PROCESS',jsonb_build_object('submissionId',p_id),p_profile);
end $$;
create or replace function public.reloo_confirm_kyc(p_profile text,p_id uuid,p_fields text,p_holder_hash text) returns void
language plpgsql security definer set search_path=public as $$
declare s kyc_submissions;prior verified_identities;
begin
  perform 1 from profiles where id=p_profile for update;
  if not found or exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') then raise exception 'ACCOUNT_RESTRICTED'; end if;
  select * into s from kyc_submissions where id=p_id and profile_id=p_profile and status='REVIEW' and provider='VNPT' and expires_at>now() for update;
  if not found or coalesce(s.checks->>'eligible','false')<>'true' or coalesce(s.face_result->>'liveness','')<>'PASSED' or coalesce((s.face_result->>'similarityPercent')::numeric,0)<=80 then raise exception 'AUTHORITATIVE_CHECKS_REQUIRED'; end if;
  select * into prior from verified_identities where profile_id=p_profile for update;
  if prior.national_id_hash is not null and prior.national_id_hash<>s.national_id_hash then raise exception 'IDENTITY_CHANGE_REQUIRES_SEPARATE_REVIEW';end if;
  update kyc_submissions set status='APPROVED',confirmation_at=now(),reason='Giấy tờ, khuôn mặt và người thật đã được đối chiếu.' where id=p_id;
  insert into verified_identities(profile_id,submission_id,fields_encrypted,holder_name_hash,national_id_hash,expires_at) values(p_profile,p_id,p_fields,p_holder_hash,s.national_id_hash,null)
  on conflict(profile_id) do update set submission_id=excluded.submission_id,fields_encrypted=excluded.fields_encrypted,holder_name_hash=excluded.holder_name_hash,national_id_hash=excluded.national_id_hash,verified_at=now();
  update profiles set kyc_level='L2' where id=p_profile;
  update profile_bank_accounts set name_status='DECLARED_NAME_MATCH' where profile_id=p_profile and holder_name_hash=p_holder_hash;
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'KYC_PROVIDER_CONFIRMED',jsonb_build_object('id',p_id,'provider','VNPT'));
end $$;
revoke all on function public.reloo_save_bank(text,jsonb),public.reloo_queue_kyc(text,uuid,text,text,jsonb,uuid),public.reloo_confirm_kyc(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reloo_save_bank(text,jsonb),public.reloo_queue_kyc(text,uuid,text,text,jsonb,uuid),public.reloo_confirm_kyc(text,uuid,text,text) to service_role;
create or replace function public.reloo_save_business(p_actor text,p_version integer,p_entity jsonb,p_deposit jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not reloo_staff_permission(p_actor,'settings.write') then raise exception 'PERMISSION_REQUIRED'; end if;
  perform 1 from business_settings where id=true and version=p_version for update;
  if not found then raise exception 'VERSION_CONFLICT'; end if;
  if p_deposit is not null and coalesce((p_deposit->>'enabled')::boolean,false) then raise exception 'ESCROW_NOT_READY'; end if;
  update business_settings set entity=coalesce(p_entity,entity),deposit=coalesce(p_deposit,deposit),version=version+1,updated_by=p_actor,updated_at=now() where id=true;
  insert into security_audit(actor_id,action,details) values(p_actor,'BUSINESS_SETTINGS_UPDATED',jsonb_build_object('version',p_version+1,'scope',case when p_entity is null then 'deposit' else 'entity' end));
end $$;
create or replace function public.reloo_save_integration(p_actor text,p_provider text,p_version integer,p_config jsonb,p_secrets text) returns void
language plpgsql security definer set search_path=public as $$
declare v_version integer;
begin
  if not reloo_staff_permission(p_actor,'settings.write') then raise exception 'PERMISSION_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('integration:'||p_provider));
  select version into v_version from integration_settings where provider=p_provider for update;
  if coalesce(v_version,0)<>p_version then raise exception 'VERSION_CONFLICT'; end if;
  insert into integration_settings(provider,config,secrets_encrypted,updated_by) values(p_provider,p_config,p_secrets,p_actor)
  on conflict(provider) do update set config=excluded.config,secrets_encrypted=excluded.secrets_encrypted,health='{}',version=integration_settings.version+1,updated_by=p_actor,updated_at=now();
  insert into security_audit(actor_id,action,details) values(p_actor,'INTEGRATION_SETTINGS_UPDATED',jsonb_build_object('provider',p_provider,'version',p_version+1));
end $$;
revoke all on function public.reloo_save_business(text,integer,jsonb,jsonb),public.reloo_save_integration(text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.reloo_save_business(text,integer,jsonb,jsonb),public.reloo_save_integration(text,text,integer,jsonb,text) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_manage_bank(p_profile text,p_id uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from profiles where id=p_profile for update;
  if not found or exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') or exists(select 1 from risk_blacklist where profile_id=p_profile and status<>'CLEARED' and (expires_at is null or expires_at>now())) then raise exception 'ACCOUNT_RESTRICTED';end if;
  perform 1 from profile_bank_accounts where id=p_id and profile_id=p_profile for update;if not found then raise exception 'BANK_REQUIRED';end if;
  if p_action='DEFAULT' then update profile_bank_accounts set is_default=false where profile_id=p_profile;update profile_bank_accounts set is_default=true where id=p_id;
  elsif p_action='REMOVE' then delete from profile_bank_accounts where id=p_id;
  else raise exception 'INVALID_BANK_ACTION';end if;
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'BANK_'||p_action,jsonb_build_object('id',p_id));
end $$;
revoke all on function public.reloo_manage_bank(text,uuid,text) from public,anon,authenticated;
grant execute on function public.reloo_manage_bank(text,uuid,text) to service_role;
notify pgrst,'reload schema';
create table if not exists public.email_exposure_checks (
  profile_id text primary key references public.profiles(id),email_hash text not null,
  email_encrypted text not null,consent_at timestamptz not null,
  result_encrypted text,status text not null default 'QUEUED' check(status in ('QUEUED','EXPOSED','NO_EXPOSURE_REPORTED','UNAVAILABLE')),
  requested_at timestamptz not null default now(),checked_at timestamptz,expires_at timestamptz
);
alter table public.email_exposure_checks enable row level security;
revoke all on public.email_exposure_checks from anon,authenticated;
grant all on public.email_exposure_checks to service_role;
create or replace function public.reloo_request_email_exposure(p_profile text,p_hash text,p_email text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare item email_exposure_checks;
begin
  perform 1 from profiles where id=p_profile for update;if not found then raise exception 'PROFILE_REQUIRED';end if;
  select * into item from email_exposure_checks where profile_id=p_profile for update;
  if found and item.email_hash=p_hash and item.requested_at>now()-interval '15 minutes' then return jsonb_build_object('queued',item.status='QUEUED','retryAt',item.requested_at+interval '15 minutes');end if;
  insert into email_exposure_checks(profile_id,email_hash,email_encrypted,consent_at) values(p_profile,p_hash,p_email,now())
  on conflict(profile_id) do update set result_encrypted=case when email_exposure_checks.email_hash=p_hash then email_exposure_checks.result_encrypted else null end,email_hash=p_hash,email_encrypted=p_email,consent_at=now(),status='QUEUED',requested_at=now();
  insert into automation_jobs(kind,payload,created_by) values('CHECK_EMAIL_EXPOSURE',jsonb_build_object('profileId',p_profile,'emailHash',p_hash),p_profile);
  return jsonb_build_object('queued',true);
end $$;
revoke all on function public.reloo_request_email_exposure(text,text,text) from public,anon,authenticated;
grant execute on function public.reloo_request_email_exposure(text,text,text) to service_role;
notify pgrst,'reload schema';
