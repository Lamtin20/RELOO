create or replace function public.reloo_request_identifier_check(p_profile text, p_identifier uuid)
returns table(job_id uuid, job_status text, retry_at timestamptz, queued boolean)
language plpgsql security definer set search_path=public as $$
declare previous automation_jobs; new_id uuid;
begin
  -- Serialize requests for one account so double clicks cannot enqueue duplicate scans.
  perform 1 from profiles where id=p_profile for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  perform 1 from risk_identifiers where id=p_identifier and profile_id=p_profile for update;
  if not found then raise exception 'IDENTIFIER_REQUIRED'; end if;
  select * into previous from automation_jobs
    where kind='SCREEN_IDENTIFIER' and payload->>'identifierId'=p_identifier::text
    order by created_at desc, id desc limit 1;
  if found and (previous.status in ('QUEUED','RUNNING') or previous.created_at > now()-interval '15 minutes') then
    return query select previous.id, previous.status, previous.created_at+interval '15 minutes', false;
    return;
  end if;
  insert into automation_jobs(kind,payload,created_by)
    values('SCREEN_IDENTIFIER',jsonb_build_object('identifierId',p_identifier),p_profile) returning id into new_id;
  insert into security_audit(actor_id,subject_id,action,details)
    values(p_profile,p_profile,'SCREENING_REQUESTED',jsonb_build_object('identifierId',p_identifier,'jobId',new_id));
  return query select new_id, 'QUEUED'::text, now()+interval '15 minutes', true;
end $$;
revoke all on function public.reloo_request_identifier_check(text,uuid) from public,anon,authenticated;
grant execute on function public.reloo_request_identifier_check(text,uuid) to service_role;
notify pgrst, 'reload schema';
