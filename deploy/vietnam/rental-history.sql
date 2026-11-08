create table if not exists public.rental_agreements (
  id uuid primary key default gen_random_uuid(),thread_id text not null references public.chat_threads(id),listing_id text not null references public.assets(id),
  lender_id text not null references public.profiles(id),renter_id text not null references public.profiles(id),proposed_by text not null references public.profiles(id),
  starts_at timestamptz not null,ends_at timestamptz not null,rent_amount bigint not null check(rent_amount>0 and rent_amount<=9007199254740991),
  terms text not null,legal_hash text not null references public.legal_document_versions(hash),policy_version integer not null,
  status text not null default 'PROPOSED' check(status in ('PROPOSED','ACCEPTED','ACTIVE','CLOSED','CANCELLED','DISPUTED')),
  sequence integer not null default 1,head_hash text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(ends_at>starts_at and ends_at<=starts_at+interval '365 days'),check(lender_id<>renter_id)
);
create table if not exists public.rental_history_events (
  id uuid primary key default gen_random_uuid(),agreement_id uuid not null references public.rental_agreements(id),sequence integer not null,
  actor_id text not null references public.profiles(id),event text not null,request_id uuid not null,
  envelope jsonb not null,digest text not null,signature text not null,signing_key_id text not null,payload_encrypted text not null,
  created_at timestamptz not null default now(),unique(agreement_id,sequence),unique(actor_id,request_id)
);
create table if not exists public.rental_confirmations (
  agreement_id uuid not null references public.rental_agreements(id),profile_id text not null references public.profiles(id),phase text not null check(phase in ('ACCEPT','HANDOVER','RETURN')),
  confirmed_at timestamptz not null default now(),primary key(agreement_id,profile_id,phase)
);
create table if not exists public.evm_anchors (
  history_id uuid primary key references public.rental_history_events(id),status text not null default 'PENDING_CONFIG' check(status in ('PENDING_CONFIG','QUEUED','SUBMITTED','CONFIRMED','REVIEW')),
  transaction_hash text,receipt jsonb,updated_at timestamptz not null default now()
);
create table if not exists public.integrity_incidents (
  id uuid primary key default gen_random_uuid(),alleged_actor_id text references public.profiles(id),resource_id uuid,
  code text not null,evidence jsonb not null,status text not null default 'REVIEW' check(status in ('REVIEW','CONFIRMED','DISMISSED')),
  reviewed_by text references public.profiles(id),reason text,created_at timestamptz not null default now(),reviewed_at timestamptz
);
create unique index if not exists integrity_one_open_resource on public.integrity_incidents(resource_id,code) where status='REVIEW';
do $$declare t text;begin
  foreach t in array array['rental_agreements','rental_history_events','rental_confirmations','evm_anchors','integrity_incidents'] loop
    execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
drop trigger if exists rental_event_immutable on public.rental_history_events;
create trigger rental_event_immutable before update or delete on public.rental_history_events for each row execute function public.reloo_immutable_record();
create or replace function public.reloo_propose_rental(p_actor text,p_id uuid,p_data jsonb,p_record jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare thread chat_threads;policy business_settings;prior rental_agreements;
begin
  select * into thread from chat_threads where id=p_data->>'threadId' for update;
  if not found or p_actor not in (thread.lender_id,thread.buyer_id) then raise exception 'PARTICIPANT_REQUIRED';end if;
  select a.* into prior from rental_agreements a join rental_history_events e on e.agreement_id=a.id where e.actor_id=p_actor and e.request_id=(p_data->>'requestId')::uuid;
  if found then
    if prior.thread_id<>thread.id or prior.rent_amount<>(p_data->>'rentAmount')::bigint or prior.starts_at<>(p_data->>'startsAt')::timestamptz or prior.ends_at<>(p_data->>'endsAt')::timestamptz or prior.terms<>p_data->>'terms' then raise exception 'REQUEST_CONTENT_CONFLICT';end if;
    return prior.id;
  end if;
  perform reloo_assert_active(thread.lender_id);perform reloo_assert_active(thread.buyer_id);
  select * into policy from business_settings where id=true;
  if policy.version<>(p_data->>'policyVersion')::integer or coalesce((policy.deposit->>'enabled')::boolean,false) then raise exception 'POLICY_CHANGED_OR_ESCROW_NOT_READY';end if;
  if not exists(select 1 from legal_publications where slug='rental-guide' and document_hash=p_data->>'legalHash') then raise exception 'PUBLISHED_TERMS_REQUIRED';end if;
  if p_record->'envelope'->>'streamId'<>p_id::text or (p_record->'envelope'->>'sequence')::integer<>1 or p_record->'envelope'->>'previousHash'<>repeat('0',64) or p_record->>'hash'!~'^[a-f0-9]{64}$' or length(p_record->>'signature')<>88 then raise exception 'INVALID_ATTESTATION';end if;
  insert into rental_agreements(id,thread_id,listing_id,lender_id,renter_id,proposed_by,starts_at,ends_at,rent_amount,terms,legal_hash,policy_version,head_hash)
  values(p_id,thread.id,thread.listing_id,thread.lender_id,thread.buyer_id,p_actor,(p_data->>'startsAt')::timestamptz,(p_data->>'endsAt')::timestamptz,(p_data->>'rentAmount')::bigint,p_data->>'terms',p_data->>'legalHash',policy.version,p_record->>'hash');
  insert into rental_confirmations values(p_id,p_actor,'ACCEPT',now());
  insert into rental_history_events(agreement_id,sequence,actor_id,event,request_id,envelope,digest,signature,signing_key_id,payload_encrypted)
  values(p_id,1,p_actor,'PROPOSED',(p_data->>'requestId')::uuid,p_record->'envelope',p_record->>'hash',p_record->>'signature',p_record->>'keyId',p_record->>'encrypted');
  insert into evm_anchors(history_id) select id from rental_history_events where agreement_id=p_id;
  return p_id;
end $$;
create or replace function public.reloo_change_rental(p_actor text,p_id uuid,p_action text,p_request uuid,p_record jsonb) returns text
language plpgsql security definer set search_path=public as $$
declare item rental_agreements;v_phase text;event_id uuid;votes integer;v_status text;
begin
  select * into item from rental_agreements where id=p_id for update;
  if not found or p_actor not in (item.lender_id,item.renter_id) then raise exception 'PARTICIPANT_REQUIRED';end if;
  if exists(select 1 from rental_history_events where actor_id=p_actor and request_id=p_request and agreement_id=p_id and event=p_action) then return item.status;end if;
  perform reloo_assert_active(item.lender_id);perform reloo_assert_active(item.renter_id);
  if (p_record->'envelope'->>'sequence')::integer<>item.sequence+1 or p_record->'envelope'->>'previousHash'<>item.head_hash or p_record->'envelope'->>'streamId'<>p_id::text then raise exception 'HISTORY_VERSION_CONFLICT';end if;
  if p_record->>'hash'!~'^[a-f0-9]{64}$' or length(p_record->>'signature')<>88 then raise exception 'INVALID_ATTESTATION';end if;
  v_status:=item.status;
  if p_action='ACCEPTED' and item.status='PROPOSED' then v_phase:='ACCEPT';
  elsif p_action='HANDOVER_CONFIRMED' and item.status='ACCEPTED' then v_phase:='HANDOVER';
  elsif p_action='RETURN_CONFIRMED' and item.status='ACTIVE' then v_phase:='RETURN';
  elsif p_action='CANCELLED' and item.status='PROPOSED' and p_actor=item.proposed_by then v_status:='CANCELLED';
  elsif p_action='DISPUTED' and item.status in ('ACCEPTED','ACTIVE') then
    v_status:='DISPUTED';
    insert into crm_records(module,title,status,data,created_by) values('support','Tranh chấp thỏa thuận thuê '||left(p_id::text,8),'OPEN',jsonb_build_object('customerId',p_actor,'body','Kiểm tra lịch sử thỏa thuận và bằng chứng giao nhận.','agreementId',p_id),p_actor);
  else raise exception 'RENTAL_TRANSITION_DENIED';end if;
  if v_phase is not null then
    if exists(select 1 from rental_confirmations where agreement_id=p_id and profile_id=p_actor and rental_confirmations.phase=v_phase) then raise exception 'ALREADY_CONFIRMED';end if;
    insert into rental_confirmations values(p_id,p_actor,v_phase,now());
    select count(*) into votes from rental_confirmations where agreement_id=p_id and rental_confirmations.phase=v_phase;
    if votes=2 then v_status:=case v_phase when 'ACCEPT' then 'ACCEPTED' when 'HANDOVER' then 'ACTIVE' else 'CLOSED' end;end if;
  end if;
  insert into rental_history_events(agreement_id,sequence,actor_id,event,request_id,envelope,digest,signature,signing_key_id,payload_encrypted)
  values(p_id,item.sequence+1,p_actor,p_action,p_request,p_record->'envelope',p_record->>'hash',p_record->>'signature',p_record->>'keyId',p_record->>'encrypted') returning id into event_id;
  insert into evm_anchors(history_id) values(event_id);
  update rental_agreements set sequence=sequence+1,head_hash=p_record->>'hash',status=v_status,updated_at=now() where id=p_id;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,p_actor,'RENTAL_'||p_action,jsonb_build_object('agreementId',p_id,'sequence',item.sequence+1));
  return v_status;
end $$;
create or replace function public.reloo_confirm_integrity_incident(p_actor text,p_id uuid,p_decision text,p_reason text) returns integer
language plpgsql security definer set search_path=public as $$
declare item integrity_incidents;strikes integer;
begin
  if not reloo_staff_permission(p_actor,'risk.write') then raise exception 'PERMISSION_REQUIRED';end if;
  select * into item from integrity_incidents where id=p_id and status='REVIEW' for update;
  if not found or item.alleged_actor_id is null or p_decision not in ('CONFIRMED','DISMISSED') or length(trim(p_reason))<30 then raise exception 'ACTOR_EVIDENCE_REQUIRED';end if;
  perform 1 from profiles where id=item.alleged_actor_id for update;
  update integrity_incidents set status=p_decision,reason=p_reason,reviewed_by=p_actor,reviewed_at=now() where id=p_id;
  select count(*) into strikes from integrity_incidents where alleged_actor_id=item.alleged_actor_id and status='CONFIRMED';
  if strikes>=3 then
    update profiles set activation_status='RESTRICTED',screening_valid_until=null where id=item.alleged_actor_id;
    if not exists(select 1 from risk_cases where profile_id=item.alleged_actor_id and status<>'CLEARED') then insert into risk_cases(profile_id,reason) values(item.alleged_actor_id,'THREE_CONFIRMED_FORGERIES');end if;
    if not exists(select 1 from risk_blacklist where profile_id=item.alleged_actor_id and kind='ACCOUNT' and status<>'CLEARED') then insert into risk_blacklist(profile_id,kind,reason,evidence,status,reviewed_by) values(item.alleged_actor_id,'ACCOUNT','THREE_CONFIRMED_FORGERIES',jsonb_build_array(jsonb_build_object('incidentId',p_id,'strikes',strikes)),'CONFIRMED',p_actor);end if;
  end if;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.alleged_actor_id,'INTEGRITY_'||p_decision,jsonb_build_object('incidentId',p_id,'strikes',strikes,'reason',p_reason));
  return strikes;
end $$;
revoke all on function public.reloo_propose_rental(text,uuid,jsonb,jsonb),public.reloo_change_rental(text,uuid,text,uuid,jsonb),public.reloo_confirm_integrity_incident(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reloo_propose_rental(text,uuid,jsonb,jsonb),public.reloo_change_rental(text,uuid,text,uuid,jsonb),public.reloo_confirm_integrity_incident(text,uuid,text,text) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_queue_next_anchors() returns integer
language plpgsql security definer set search_path=public as $$
declare item record;n integer:=0;
begin
  for item in select x.history_id from evm_anchors x join rental_history_events h on h.id=x.history_id where x.status='PENDING_CONFIG' and not exists(select 1 from rental_history_events earlier join evm_anchors a on a.history_id=earlier.id where earlier.agreement_id=h.agreement_id and earlier.sequence<h.sequence and a.status<>'CONFIRMED') order by h.created_at for update of x skip locked limit 20 loop
    update evm_anchors set status='QUEUED' where history_id=item.history_id;
    insert into automation_jobs(kind,payload) values('ANCHOR_RENTAL',jsonb_build_object('historyId',item.history_id));n:=n+1;
  end loop;
  return n;
end $$;
revoke all on function public.reloo_queue_next_anchors() from public,anon,authenticated;
grant execute on function public.reloo_queue_next_anchors() to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_rental_snapshot(p_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('agreement',to_jsonb(a),'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.sequence) from rental_history_events e where e.agreement_id=a.id),'[]'::jsonb),'confirmations',coalesce((select jsonb_agg(jsonb_build_object('profile_id',c.profile_id,'phase',c.phase)) from rental_confirmations c where c.agreement_id=a.id),'[]'::jsonb),'anchors',coalesce((select jsonb_agg(to_jsonb(x)) from evm_anchors x join rental_history_events h on h.id=x.history_id where h.agreement_id=a.id),'[]'::jsonb)) from rental_agreements a where a.id=p_id;
$$;
revoke all on function public.reloo_rental_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.reloo_rental_snapshot(uuid) to service_role;
notify pgrst,'reload schema';
