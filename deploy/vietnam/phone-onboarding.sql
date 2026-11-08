-- Additive, no contact/address data is fabricated for phone-only identities.
begin;
alter table public.profiles alter column email drop not null;
create or replace function public.reloo_finish_signup_profile(
 p_auth_user_id uuid,p_email text,p_name text,p_phone text,p_role text,p_avatar_url text,p_status text,p_results jsonb,p_ip_hash text,p_details jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile profiles;v_id text;v_outcome jsonb;begin
 perform pg_advisory_xact_lock(hashtextextended('reloo-profile:'||p_auth_user_id::text,0));
 if p_auth_user_id is null or length(trim(p_name))<2 or length(p_name)>100 or p_role not in ('renter','lender','both') or reloo_normalize_phone(p_phone) is null or coalesce(p_details->>'housingType','') not in ('HOUSE','APARTMENT','OTHER') or coalesce(p_details->>'birthDate','') !~ '^\d{4}-\d{2}-\d{2}$' or length(coalesce(p_details->>'address',''))<2 or octet_length(p_details::text)>6000 then raise exception 'INVALID_PROFILE';end if;
 if (p_details->>'birthDate')::date>current_date or (p_details->>'birthDate')::date<current_date-interval '120 years' then raise exception 'INVALID_PROFILE';end if;
 if not exists(select 1 from auth.users u where u.id=p_auth_user_id and (nullif(lower(p_email),'')=lower(u.email) or nullif(p_email,'') is null and reloo_normalize_phone(u.phone)=reloo_normalize_phone(p_phone) and u.phone_confirmed_at is not null)) then raise exception 'AUTH_IDENTITY_MISMATCH';end if;
 select * into v_profile from profiles where auth_user_id=p_auth_user_id for update;
 if found and reloo_normalize_phone(v_profile.phone) is not null then return jsonb_build_object('profile_id',v_profile.id,'activation_status',v_profile.activation_status,'screening_status',v_profile.phone_screening_status,'already_complete',true);end if;
 if v_profile.id is null then v_id:=p_auth_user_id::text;insert into profiles(id,auth_user_id,email,name,phone,role,avatar_url,status,activation_status,phone_screening_status,profile_data) values(v_id,p_auth_user_id,nullif(lower(p_email),''),trim(p_name),reloo_normalize_phone(p_phone),p_role,p_avatar_url,'active','PENDING','UNKNOWN',p_details);
 else v_id:=v_profile.id;update profiles set name=trim(p_name),phone=reloo_normalize_phone(p_phone),activation_status=case when activation_status='RESTRICTED' then 'RESTRICTED' else 'PENDING' end,screening_valid_until=null,profile_data=coalesce(profile_data,'{}')||p_details where id=v_id;end if;
 v_outcome:=reloo_record_screening(v_id,p_status,p_results,p_ip_hash);
 insert into security_audit(actor_id,subject_id,action,details) values(v_id,v_id,'AUTH_PROFILE_COMPLETED',jsonb_build_object('method',case when p_email is null then 'PHONE' else 'EMAIL_OR_OAUTH' end,'onboardingVersion',2));
 return v_outcome||jsonb_build_object('profile_id',v_id,'screening_status',p_status,'already_complete',false);
end$$;
revoke all on function public.reloo_finish_signup_profile(uuid,text,text,text,text,text,text,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_finish_signup_profile(uuid,text,text,text,text,text,text,jsonb,text,jsonb) to service_role;
commit;
