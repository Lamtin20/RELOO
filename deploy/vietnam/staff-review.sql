create or replace function public.reloo_review_case(p_actor_id text,p_case_id uuid,p_action text,p_reason text,p_evidence jsonb,p_valid_hours integer default 720)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_case risk_cases; v_item jsonb;
begin
  if not reloo_staff_permission(p_actor_id,'risk.write') then raise exception 'PERMISSION_REQUIRED'; end if;
  select * into v_case from risk_cases where id=p_case_id for update;
  if not found or v_case.status='CLEARED' then raise exception 'CASE_NOT_OPEN'; end if;
  if length(trim(p_reason))<20 or p_action not in ('VERIFY','RESTRICT','CLEAR') then raise exception 'REASON_REQUIRED'; end if;
  if p_action='CLEAR' and (jsonb_array_length(p_evidence)=0 or p_valid_hours<1 or p_valid_hours>720 or exists(select 1 from risk_blacklist where profile_id=v_case.profile_id and status<>'CLEARED' and (expires_at is null or expires_at>now()))) then raise exception 'VERIFICATION_EVIDENCE_REQUIRED'; end if;
  for v_item in select * from jsonb_array_elements(p_evidence) loop
    if coalesce(v_item->>'url','')!~'^https://' or length(coalesce(v_item->>'note',''))<10 then raise exception 'INVALID_EVIDENCE'; end if;
    insert into risk_evidence(case_id,source,evidence_url,note,submitted_by) values(p_case_id,coalesce(v_item->>'source','admin_review'),v_item->>'url',v_item->>'note',p_actor_id);
  end loop;
  update risk_cases set status=case p_action when 'CLEAR' then 'CLEARED' when 'VERIFY' then 'VERIFYING' else 'RESTRICTED' end,reviewed_by=p_actor_id,updated_at=now() where id=p_case_id;
  update profiles set activation_status=case when p_action='CLEAR' then 'ACTIVE' else 'RESTRICTED' end,screening_valid_until=case when p_action='CLEAR' then now()+make_interval(hours=>p_valid_hours) else null end,verification_method=case when p_action='CLEAR' then 'ADMIN_REVIEW' else null end where id=v_case.profile_id;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor_id,v_case.profile_id,'RISK_CASE_'||p_action,jsonb_build_object('caseId',p_case_id,'reason',p_reason,'evidence',p_evidence,'validHours',p_valid_hours));
  return jsonb_build_object('ok',true,'case_id',p_case_id);
end $$;
revoke all on function public.reloo_review_case(text,uuid,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.reloo_review_case(text,uuid,text,text,jsonb,integer) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_review_kyc_identity(p_actor text,p_id uuid,p_reason text,p_fields text,p_holder_hash text,p_national_hash text) returns void
language plpgsql security definer set search_path=public as $$
declare item kyc_submissions;prior verified_identities;
begin
  if not reloo_staff_permission(p_actor,'kyc.write') then raise exception 'PERMISSION_REQUIRED';end if;
  select * into item from kyc_submissions where id=p_id for update;if not found then raise exception 'SUBMISSION_REQUIRED';end if;
  select * into prior from verified_identities where profile_id=item.profile_id for update;
  if prior.national_id_hash is not null and prior.national_id_hash<>p_national_hash then raise exception 'IDENTITY_CHANGE_REQUIRES_SEPARATE_REVIEW';end if;
  perform reloo_review_kyc(p_actor,p_id,'APPROVED',p_reason);
  insert into verified_identities(profile_id,submission_id,fields_encrypted,holder_name_hash,national_id_hash) values(item.profile_id,p_id,p_fields,p_holder_hash,p_national_hash)
  on conflict(profile_id) do update set submission_id=p_id,fields_encrypted=p_fields,holder_name_hash=p_holder_hash,national_id_hash=p_national_hash,verified_at=now();
  update profile_bank_accounts set name_status='DECLARED_NAME_MATCH' where profile_id=item.profile_id and holder_name_hash=p_holder_hash;
end $$;
revoke all on function public.reloo_review_kyc_identity(text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reloo_review_kyc_identity(text,uuid,text,text,text,text) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_review_kyc(p_actor text,p_id uuid,p_action text,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare item kyc_submissions; views integer;
begin
  if not reloo_staff_permission(p_actor,'kyc.write') then raise exception 'PERMISSION_REQUIRED'; end if;
  select * into item from kyc_submissions where id=p_id and status='REVIEW' and expires_at>now() for update;
  if not found or p_action not in ('APPROVED','REJECTED') or length(trim(p_reason))<20 then raise exception 'INVALID_REVIEW'; end if;
  select count(distinct details->>'kind') into views from security_audit where actor_id=p_actor and action='KYC_DOCUMENT_VIEWED' and details->>'id'=p_id::text;
  if p_action='APPROVED' and views<(case when item.document_paths ? 'video' then 4 else 3 end) then raise exception 'REVIEW_ALL_DOCUMENTS'; end if;
  update kyc_submissions set status=p_action,reason=p_reason,reviewed_by=p_actor where id=p_id;
  if p_action='APPROVED' then update profiles set kyc_level='L2' where id=item.profile_id; end if;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.profile_id,'KYC_'||p_action,jsonb_build_object('id',p_id,'reason',p_reason));
end $$;
revoke all on function public.reloo_review_kyc(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reloo_review_kyc(text,uuid,text,text) to service_role;
notify pgrst,'reload schema';
