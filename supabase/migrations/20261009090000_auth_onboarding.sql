-- Google/password signup profiles are created with screening/audit in one DB transaction.
create or replace function public.reloo_normalize_phone(p_phone text) returns text language plpgsql immutable as $$
declare v_phone text;
begin
  if p_phone is null or length(p_phone)>30 or p_phone !~ '^[+0-9\s().-]+$' then return null; end if;
  v_phone := regexp_replace(p_phone,'[\s().-]','','g');
  if left(v_phone,3)='+84' then v_phone := '0'||substring(v_phone from 4);
  elsif left(v_phone,4)='0084' then v_phone := '0'||substring(v_phone from 5);
  elsif left(v_phone,2)='84' and length(v_phone)=11 then v_phone := '0'||substring(v_phone from 3); end if;
  -- VN mobile metadata from libphonenumber-js 1.13.15, constrained to domestic 10-digit numbers.
  return case when length(v_phone)=10 and v_phone ~ '^0(?:121[0-3]\d{5}|(?:1[46]0|(?:3\d|7[06-9])\d|5(?:[1689]\d|2[238]|59)|8(?:[1-8]\d|9[6-9])|9(?:[0-8]\d|9[013-9]))\d{6})$' then v_phone else null end;
end; $$;

create or replace function public.reloo_complete_auth_profile(
  p_auth_user_id uuid,p_email text,p_name text,p_phone text,p_role text,p_avatar_url text,p_status text,p_results jsonb,p_ip_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile profiles; v_id text; v_outcome jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('reloo-profile:'||p_auth_user_id::text,0));
  if p_auth_user_id is null or p_email is null or length(trim(p_name))<2 or length(p_name)>100
    or p_role not in ('renter','lender','both') or reloo_normalize_phone(p_phone) is null then raise exception 'INVALID_PROFILE'; end if;
  select * into v_profile from profiles where auth_user_id=p_auth_user_id for update;
  -- A repeat OAuth callback/onboarding request cannot replace a completed profile or clear its restrictions.
  if found and reloo_normalize_phone(v_profile.phone) is not null then
    return jsonb_build_object('profile_id',v_profile.id,'activation_status',v_profile.activation_status,'screening_status',v_profile.phone_screening_status,'already_complete',true);
  end if;
  if v_profile.id is null then
    v_id := p_auth_user_id::text;
    insert into profiles(id,auth_user_id,email,name,phone,role,avatar_url,status,activation_status,phone_screening_status)
      values(v_id,p_auth_user_id,lower(p_email),trim(p_name),reloo_normalize_phone(p_phone),p_role,p_avatar_url,'active','PENDING','UNKNOWN');
  else
    v_id := v_profile.id;
    update profiles set name=trim(p_name),phone=reloo_normalize_phone(p_phone),activation_status=case when activation_status='RESTRICTED' then 'RESTRICTED' else 'PENDING' end,screening_valid_until=null where id=v_id;
  end if;
  v_outcome := reloo_record_screening(v_id,p_status,p_results,p_ip_hash);
  insert into security_audit(actor_id,subject_id,action,details)
    values(v_id,v_id,'AUTH_PROFILE_COMPLETED',jsonb_build_object('authUserId',p_auth_user_id,'screeningStatus',p_status,'activation',v_outcome->>'activation_status'));
  return v_outcome || jsonb_build_object('profile_id',v_id,'screening_status',p_status,'already_complete',false);
end; $$;
revoke all on function public.reloo_complete_auth_profile(uuid,text,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.reloo_complete_auth_profile(uuid,text,text,text,text,text,text,jsonb,text) to service_role;

create or replace function public.reloo_assert_active(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from profiles where id=p_profile_id and status='active' and activation_status='ACTIVE'
    and screening_valid_until>now() and reloo_normalize_phone(phone) is not null)
    or exists(select 1 from risk_cases where profile_id=p_profile_id and status <> 'CLEARED') then
    raise exception 'ACCOUNT_RESTRICTED' using errcode='42501';
  end if;
end; $$;
revoke all on function public.reloo_assert_active(text) from public,anon,authenticated;
grant execute on function public.reloo_assert_active(text) to service_role;
