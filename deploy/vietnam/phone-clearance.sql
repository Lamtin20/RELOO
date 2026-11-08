create or replace function public.reloo_confirm_phone_lookup(p_id uuid, p_phone text, p_results jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item risk_identifiers; account profiles; accepted jsonb; v_check_id uuid; open_case risk_cases; valid_until timestamptz;
begin
  select * into item from risk_identifiers where id=p_id and kind='PHONE';
  if not found then raise exception 'PHONE_IDENTIFIER_REQUIRED'; end if;
  select * into account from profiles where id=item.profile_id for update;
  if reloo_normalize_phone(p_phone) is null or reloo_normalize_phone(account.phone) is distinct from reloo_normalize_phone(p_phone) then
    return jsonb_build_object('activated',false,'reason','PHONE_CHANGED');
  end if;
  if item.status<>'NO_MATCH' or item.source_results is distinct from p_results or item.checked_at is null or item.checked_at < now()-interval '15 minutes' then raise exception 'FRESH_LOOKUP_REQUIRED'; end if;
  select r into accepted from jsonb_array_elements(p_results) r
    where r->>'source'='chongluadao' and r->>'status'='NO_MATCH'
      and r->>'complete'='true' and r->>'matchedInput'='true'
      and r->>'scope'='phone_warning_cards' and r->>'policy'='CLD_NOT_FOUND_V1'
      and r->>'sourceUrl' ~ '^https://chongluadao\.vn/analyze/\?'
      and r->>'sourceUrl' ~ ('[?&]q='||reloo_normalize_phone(p_phone)||'(&|$)')
      and (r->>'checkedAt')::timestamptz between now()-interval '15 minutes' and now()+interval '1 minute'
      and (r->>'expiresAt')::timestamptz between now() and now()+interval '24 hours 1 minute'
    limit 1;
  if accepted is null or exists(select 1 from jsonb_array_elements(p_results) r where r->>'status'='MATCH') then raise exception 'ACCEPTED_PHONE_RESULT_REQUIRED'; end if;
  -- Negative phone results never override a separate warning or administrator restriction.
  if account.status<>'active' or account.activation_status='RESTRICTED'
    or exists(select 1 from risk_blacklist where profile_id=account.id and status<>'CLEARED' and (expires_at is null or expires_at>now()))
    or exists(select 1 from risk_cases where profile_id=account.id and status<>'CLEARED'
      and (reason not in ('UNKNOWN','UNAVAILABLE','STALE') or status not in ('OPEN','APPEALED') or reviewed_by is not null)) then
    return jsonb_build_object('activated',false,'reason','INDEPENDENT_REVIEW_REQUIRED');
  end if;
  valid_until := (accepted->>'expiresAt')::timestamptz;
  insert into phone_screening_checks(profile_id,result,source_results) values(account.id,'NO_MATCH',p_results) returning id into v_check_id;
  for open_case in select * from risk_cases where profile_id=account.id and status<>'CLEARED' for update loop
    insert into risk_evidence(case_id,source,evidence_url,note)
      values(open_case.id,'chongluadao',accepted->>'sourceUrl','Both iCallme and Scam.vn returned NOT_FOUND for the current phone; RELOO CLD_NOT_FOUND_V1 policy.');
    update risk_cases set status='CLEARED',check_id=v_check_id,updated_at=now() where id=open_case.id;
  end loop;
  update profiles set phone_screening_status='NO_MATCH',activation_status='ACTIVE',screening_valid_until=valid_until,verification_method='CLD_NOT_FOUND_V1' where id=account.id;
  insert into security_audit(subject_id,action,details) values(account.id,'PHONE_POLICY_CONFIRMED',jsonb_build_object('identifierId',p_id,'checkId',v_check_id,'policy','CLD_NOT_FOUND_V1','validUntil',valid_until));
  return jsonb_build_object('activated',true,'validUntil',valid_until);
end $$;
revoke all on function public.reloo_confirm_phone_lookup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_confirm_phone_lookup(uuid,text,jsonb) to service_role;
notify pgrst, 'reload schema';
