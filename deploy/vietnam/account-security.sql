create table if not exists public.account_security (
 profile_id text primary key references public.profiles(id) on delete cascade,
 pin_hash text,pin_salt text,pin_attempts integer not null default 0,pin_locked_until timestamptz,
 revision integer not null default 0,updated_at timestamptz not null default now()
);
create table if not exists public.account_security_otps (
 id uuid primary key,profile_id text not null references public.profiles(id) on delete cascade,
 session_id text not null,purpose text not null,code_hash text not null,
 expires_at timestamptz not null default now()+interval '5 minutes',created_at timestamptz not null default now(),
 attempts integer not null default 0,delivery text not null default 'PENDING',verified_at timestamptz,consumed_at timestamptz
);
create index if not exists account_security_otp_recent on public.account_security_otps(profile_id,created_at desc);
alter table public.account_security enable row level security;
alter table public.account_security_otps enable row level security;
revoke all on public.account_security,public.account_security_otps from PUBLIC,anon,authenticated;
grant all on public.account_security,public.account_security_otps to service_role;

create or replace function public.reloo_account_security_state(p_profile text) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('hasPassword',coalesce(length(u.encrypted_password)>0,false),'hasPin',s.pin_hash is not null,'revision',coalesce(s.revision,0),'pinLockedUntil',s.pin_locked_until)
 from profiles p join auth.users u on u.id=p.auth_user_id left join account_security s on s.profile_id=p.id where p.id=p_profile and p.deleted_at is null;
$$;
create or replace function public.reloo_issue_account_otp(p_profile text,p_id uuid,p_session text,p_purpose text,p_hash text) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform 1 from profiles where id=p_profile and deleted_at is null for update;if not found then raise exception 'PROFILE_REQUIRED';end if;
 if p_purpose not in ('PIN_SET','PIN_CHANGE','PASSWORD_SET','PASSWORD_CHANGE','PASSKEY_ENROLL','PASSKEY_REMOVE') or length(p_session)<10 or p_hash!~'^[a-f0-9]{64}$' then raise exception 'OTP_INVALID';end if;
 if exists(select 1 from account_security_otps where profile_id=p_profile and created_at>now()-interval '60 seconds') then raise exception 'OTP_COOLDOWN';end if;
 if (select count(*) from account_security_otps where profile_id=p_profile and created_at>now()-interval '1 hour')>=8 then raise exception 'OTP_RATE_LIMIT';end if;
 update account_security_otps set consumed_at=now() where profile_id=p_profile and consumed_at is null;
 insert into account_security_otps(id,profile_id,session_id,purpose,code_hash) values(p_id,p_profile,p_session,p_purpose,p_hash);
end $$;
create or replace function public.reloo_verify_account_otp(p_profile text,p_id uuid,p_session text,p_hash text) returns boolean
language plpgsql security definer set search_path=public as $$
declare item account_security_otps;
begin
 select * into item from account_security_otps where id=p_id and profile_id=p_profile and session_id=p_session for update;
 if not found or item.delivery<>'SENT' or item.expires_at<=now() or item.consumed_at is not null or item.attempts>=5 or item.verified_at is not null then return false;end if;
 if item.code_hash is distinct from p_hash then update account_security_otps set attempts=attempts+1 where id=p_id;return false;end if;
 update account_security_otps set verified_at=now() where id=p_id;return true;
end $$;
create or replace function public.reloo_consume_account_otp(p_profile text,p_id uuid,p_session text,p_purpose text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 update account_security_otps set consumed_at=now() where id=p_id and profile_id=p_profile and session_id=p_session and purpose=p_purpose and verified_at is not null and consumed_at is null and expires_at>now();return found;
end $$;
create or replace function public.reloo_verify_account_pin(p_profile text,p_hash text) returns boolean
language plpgsql security definer set search_path=public as $$
declare item account_security;
begin
 select * into item from account_security where profile_id=p_profile for update;
 if not found or item.pin_hash is null or item.pin_locked_until>now() then return false;end if;
 if item.pin_locked_until is not null then item.pin_attempts=0;end if;
 if item.pin_hash is distinct from p_hash then
  update account_security set pin_attempts=item.pin_attempts+1,pin_locked_until=case when item.pin_attempts+1>=5 then now()+interval '15 minutes' else null end where profile_id=p_profile;return false;
 end if;
 update account_security set pin_attempts=0,pin_locked_until=null where profile_id=p_profile;return true;
end $$;
create or replace function public.reloo_set_account_pin(p_profile text,p_hash text,p_salt text,p_revision integer) returns void
language plpgsql security definer set search_path=public as $$
begin
 if coalesce(p_hash,'')!~'^[a-f0-9]{64}$' or coalesce(p_salt,'')!~'^[a-f0-9]{32}$' or p_revision is null or p_revision<0 then raise exception 'PIN_INVALID';end if;
 perform 1 from profiles where id=p_profile and deleted_at is null for update;if not found then raise exception 'PROFILE_REQUIRED';end if;
 insert into account_security(profile_id) values(p_profile) on conflict do nothing;
 update account_security set pin_hash=p_hash,pin_salt=p_salt,pin_attempts=0,pin_locked_until=null,revision=revision+1,updated_at=now() where profile_id=p_profile and revision=p_revision;
 if not found then raise exception 'SECURITY_CHANGED';end if;
 insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'ACCOUNT_PIN_CHANGED','{}');
end $$;
revoke all on function public.reloo_account_security_state(text),public.reloo_issue_account_otp(text,uuid,text,text,text),public.reloo_verify_account_otp(text,uuid,text,text),public.reloo_consume_account_otp(text,uuid,text,text),public.reloo_verify_account_pin(text,text),public.reloo_set_account_pin(text,text,text,integer) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_account_security_state(text),public.reloo_issue_account_otp(text,uuid,text,text,text),public.reloo_verify_account_otp(text,uuid,text,text),public.reloo_consume_account_otp(text,uuid,text,text),public.reloo_verify_account_pin(text,text),public.reloo_set_account_pin(text,text,text,integer) to service_role;
alter table public.business_settings add column if not exists entity_draft jsonb;
alter table public.mobile_auth_flows add column if not exists expected_user_id uuid;
create or replace function public.reloo_save_business_entity(p_actor text,p_version integer,p_entity jsonb,p_confirmed boolean) returns void
language plpgsql security definer set search_path=public as $$
declare draft jsonb;
begin
 if not reloo_staff_permission(p_actor,'settings.write') then raise exception 'PERMISSION_REQUIRED';end if;
 select entity_draft into draft from business_settings where id=true for update;
 if draft is not null and p_confirmed is distinct from true then raise exception 'OFFICIAL_CONFIRMATION_REQUIRED';end if;
 perform reloo_save_business(p_actor,p_version,p_entity,null);
 update business_settings set entity_draft=null where id=true;
end $$;
revoke all on function public.reloo_save_business_entity(text,integer,jsonb,boolean) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_save_business_entity(text,integer,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
