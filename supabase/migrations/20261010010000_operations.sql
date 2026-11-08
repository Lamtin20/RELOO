create table public.crm_staff (
  profile_id text primary key references public.profiles(id), role text not null,
  permissions text[] not null default '{}', enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.crm_records (
  id uuid primary key default gen_random_uuid(), module text not null, title text not null,
  status text not null default 'DRAFT', data jsonb not null default '{}',
  created_by text references public.profiles(id), assigned_to text references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create index crm_records_module_created on public.crm_records(module,created_at desc);
create table public.risk_identifiers (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  kind text not null check(kind in ('PHONE','ZALO','EMAIL','BANK')), bank_code text not null default '',
  value_hash text not null, value_encrypted text not null, masked_value text not null,
  status text not null default 'UNKNOWN' check(status in ('MATCH','NO_MATCH','UNKNOWN','UNAVAILABLE','STALE')),
  source_results jsonb not null default '[]', checked_at timestamptz, expires_at timestamptz,
  created_at timestamptz not null default now(), unique(profile_id,kind,bank_code,value_hash)
);
create table public.risk_blacklist (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  kind text not null check(kind in ('ACCOUNT','PHONE','ZALO','EMAIL','BANK','DEVICE','IP')),
  value_hash text, scope text not null default 'business', reason text not null, evidence jsonb not null default '[]',
  status text not null default 'REVIEW' check(status in ('REVIEW','CONFIRMED','CLEARED')),
  expires_at timestamptz, reviewed_by text references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(kind not in ('IP','DEVICE') or expires_at is not null)
);
create table public.network_checks (
  ip_hash text primary key, result text not null check(result in ('ANONYMOUS','ORDINARY','UNKNOWN','UNAVAILABLE')),
  source text not null, evidence jsonb not null default '{}', checked_at timestamptz not null default now(), expires_at timestamptz not null
);
create table public.automation_jobs (
  id uuid primary key default gen_random_uuid(), kind text not null,
  payload jsonb not null default '{}', status text not null default 'QUEUED' check(status in ('QUEUED','RUNNING','DONE','FAILED','CANCELLED')),
  attempts integer not null default 0, run_at timestamptz not null default now(), locked_at timestamptz,
  result jsonb, created_by text references public.profiles(id), created_at timestamptz not null default now()
);
create index automation_due on public.automation_jobs(status,run_at);
create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  national_id_encrypted text not null, national_id_hash text not null, document_paths jsonb not null,
  consent_at timestamptz not null, status text not null default 'QUEUED' check(status in ('QUEUED','PROCESSING','REVIEW','APPROVED','REJECTED','EXPIRED')),
  extracted_encrypted text, face_result jsonb, reason text, reviewed_by text references public.profiles(id),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 days'
);
create unique index kyc_one_pending on public.kyc_submissions(profile_id) where status in ('QUEUED','PROCESSING','REVIEW');
create table public.journey_events (
  id uuid primary key default gen_random_uuid(), visitor_hash text not null, session_hash text not null,
  event text not null, path text not null, category text, duration_ms integer,
  created_at timestamptz not null default now()
);
create index journey_by_date on public.journey_events(created_at desc);
create table public.api_traces (
  id uuid primary key default gen_random_uuid(), method text not null, route text not null,
  status integer not null, duration_ms integer not null, created_at timestamptz not null default now()
);
create table public.support_conversations (
  id uuid primary key default gen_random_uuid(), profile_id text references public.profiles(id),
  title text not null, status text not null default 'OPEN', created_at timestamptz not null default now()
);
create table public.support_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.support_conversations(id),
  role text not null check(role in ('USER','ASSISTANT','STAFF')), body text not null, model text, created_at timestamptz not null default now()
);
do $$ declare name text; begin
  foreach name in array array['crm_staff','crm_records','risk_identifiers','risk_blacklist','network_checks','automation_jobs','kyc_submissions','journey_events','api_traces','support_conversations','support_messages'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from anon,authenticated',name);
    execute format('grant all on public.%I to service_role',name);
  end loop;
end $$;
create or replace function public.reloo_staff_permission(p_actor text,p_permission text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from crm_staff where profile_id=p_actor and enabled and ('*'=any(permissions) or p_permission=any(permissions)));
$$;
create or replace function public.reloo_screen_identifier(p_id uuid,p_status text,p_results jsonb,p_expires timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare item risk_identifiers; case_id uuid;
begin
  select * into item from risk_identifiers where id=p_id for update;
  if not found then raise exception 'IDENTIFIER_REQUIRED'; end if;
  if p_status not in ('MATCH','NO_MATCH','UNKNOWN','UNAVAILABLE','STALE') then raise exception 'INVALID_STATUS'; end if;
  if p_status='MATCH' and not exists(select 1 from jsonb_array_elements(p_results) r where r->>'status'='MATCH' and jsonb_array_length(coalesce(r->'evidence','[]'))>0) then raise exception 'EVIDENCE_REQUIRED'; end if;
  update risk_identifiers set status=p_status,source_results=p_results,checked_at=now(),expires_at=p_expires where id=p_id;
  if p_status='MATCH' then
    perform 1 from profiles where id=item.profile_id for update;
    update profiles set activation_status='RESTRICTED',screening_valid_until=null where id=item.profile_id;
    select id into case_id from risk_cases where profile_id=item.profile_id and status<>'CLEARED';
    if case_id is null then insert into risk_cases(profile_id,reason) values(item.profile_id,'IDENTIFIER_MATCH') returning id into case_id; end if;
    if not exists(select 1 from risk_blacklist where profile_id=item.profile_id and kind=item.kind and value_hash=item.value_hash and status<>'CLEARED') then
      insert into risk_blacklist(profile_id,kind,value_hash,reason,evidence) values(item.profile_id,item.kind,item.value_hash,'SOURCE_MATCH_REQUIRES_REVIEW',p_results);
    end if;
    insert into security_audit(subject_id,action,details) values(item.profile_id,'IDENTIFIER_MATCH',jsonb_build_object('identifierId',p_id,'caseId',case_id));
  end if;
end $$;
create or replace function public.reloo_blacklist_decision(p_actor text,p_id uuid,p_action text,p_reason text,p_evidence jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare item risk_blacklist;
begin
  if not reloo_staff_permission(p_actor,'risk.write') then raise exception 'PERMISSION_REQUIRED'; end if;
  if p_action not in ('CONFIRMED','CLEARED') or length(trim(p_reason))<20 or jsonb_array_length(p_evidence)=0 then raise exception 'EVIDENCE_REQUIRED'; end if;
  select * into item from risk_blacklist where id=p_id for update;
  if not found then raise exception 'ENTRY_REQUIRED'; end if;
  update risk_blacklist set status=p_action,reviewed_by=p_actor,reason=p_reason,evidence=evidence||p_evidence,updated_at=now() where id=p_id;
  if p_action='CONFIRMED' then update profiles set activation_status='RESTRICTED',screening_valid_until=null where id=item.profile_id; end if;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.profile_id,'BLACKLIST_'||p_action,jsonb_build_object('entryId',p_id,'reason',p_reason,'evidence',p_evidence));
  -- Clearing one entry does not automatically clear the associated RiskCase or activate the account.
end $$;
create or replace function public.reloo_claim_job() returns setof automation_jobs language plpgsql security definer set search_path=public as $$
begin
  return query update automation_jobs set status='RUNNING',attempts=attempts+1,locked_at=now()
  where id=(select id from automation_jobs where status='QUEUED' and run_at<=now() order by run_at for update skip locked limit 1) returning *;
end $$;
create or replace function public.reloo_profile_update(p_profile text,p_updates jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from profiles where id=p_profile for update;
  if exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') or exists(select 1 from risk_blacklist where profile_id=p_profile and status<>'CLEARED' and (expires_at is null or expires_at>now())) then raise exception 'ACCOUNT_RESTRICTED'; end if;
  update profiles set name=coalesce(nullif(p_updates->>'name',''),name),profile_data=coalesce(profile_data,'{}')||p_updates where id=p_profile;
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'PROFILE_UPDATED',jsonb_build_object('fields',(select jsonb_agg(key) from jsonb_object_keys(p_updates) key)));
end $$;
create or replace function public.reloo_assert_active(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from profiles where id=p_profile_id and status='active' and activation_status='ACTIVE' and screening_valid_until>now() and reloo_normalize_phone(phone) is not null)
    or exists(select 1 from risk_cases where profile_id=p_profile_id and status<>'CLEARED')
    or exists(select 1 from risk_blacklist where profile_id=p_profile_id and status<>'CLEARED' and (expires_at is null or expires_at>now())) then
    raise exception 'ACCOUNT_RESTRICTED' using errcode='42501';
  end if;
end $$;
revoke update(name,avatar_url) on public.profiles from authenticated;
revoke all on function public.reloo_staff_permission(text,text),public.reloo_screen_identifier(uuid,text,jsonb,timestamptz),public.reloo_blacklist_decision(text,uuid,text,text,jsonb),public.reloo_claim_job(),public.reloo_profile_update(text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_staff_permission(text,text),public.reloo_screen_identifier(uuid,text,jsonb,timestamptz),public.reloo_blacklist_decision(text,uuid,text,text,jsonb),public.reloo_claim_job(),public.reloo_profile_update(text,jsonb) to service_role;
