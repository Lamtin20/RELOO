-- Apply after the two existing migrations. New accounts fail closed until verified.
alter table public.profiles add column if not exists activation_status text not null default 'PENDING'
  check (activation_status in ('PENDING','ACTIVE','RESTRICTED'));
alter table public.profiles add column if not exists phone_screening_status text not null default 'UNKNOWN'
  check (phone_screening_status in ('MATCH','NO_MATCH','UNKNOWN','UNAVAILABLE','STALE'));
alter table public.profiles add column if not exists screening_valid_until timestamptz;
alter table public.profiles add column if not exists verification_method text;
revoke update on public.profiles from anon, authenticated;
-- Profile updates use authenticated backend endpoints; never grant browser roles
-- public-schema column access, including when this historical migration is replayed.
revoke update(name, avatar_url) on public.profiles from public, anon, authenticated;

create table if not exists public.phone_risk_signals (
  id uuid primary key default gen_random_uuid(), phone text not null check (phone ~ '^0[35789][0-9]{8}$'),
  source text not null, evidence_url text not null, evidence_note text not null,
  enabled boolean not null default true, expires_at timestamptz not null,
  created_by text not null references public.profiles(id), created_at timestamptz not null default now()
);
create index if not exists phone_risk_signals_phone_idx on public.phone_risk_signals(phone);
create table if not exists public.phone_screening_checks (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  result text not null check (result in ('MATCH','NO_MATCH','UNKNOWN','UNAVAILABLE','STALE')),
  source_results jsonb not null, ip_hash text, checked_at timestamptz not null default now()
);
create table if not exists public.risk_cases (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  check_id uuid references public.phone_screening_checks(id), reason text not null,
  status text not null default 'OPEN' check (status in ('OPEN','VERIFYING','APPEALED','RESTRICTED','CLEARED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_by text references public.profiles(id)
);
create unique index if not exists risk_case_one_open on public.risk_cases(profile_id) where status <> 'CLEARED';
create table if not exists public.risk_evidence (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.risk_cases(id),
  source text not null, evidence_url text not null, note text not null,
  submitted_by text references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.risk_appeals (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.risk_cases(id),
  profile_id text not null references public.profiles(id), explanation text not null,
  evidence jsonb not null default '[]', created_at timestamptz not null default now()
);
create table if not exists public.security_audit (
  id uuid primary key default gen_random_uuid(), actor_id text, subject_id text, action text not null,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.scoped_ip_signals (
  id uuid primary key default gen_random_uuid(), ip_hash text not null,
  profile_id text not null references public.profiles(id), scope text not null,
  reason text not null, created_by text not null references public.profiles(id),
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours'),
  check (scope in ('listing_write','inquiry_write','chat_write','cashback'))
);
create or replace function public.security_immutable() returns trigger language plpgsql as $$
begin raise exception 'Security evidence/audit is append-only'; end; $$;
drop trigger if exists security_audit_immutable on public.security_audit;
create trigger security_audit_immutable before update or delete on public.security_audit for each row execute function public.security_immutable();
drop trigger if exists screening_checks_immutable on public.phone_screening_checks;
create trigger screening_checks_immutable before update or delete on public.phone_screening_checks for each row execute function public.security_immutable();
drop trigger if exists risk_evidence_immutable on public.risk_evidence;
create trigger risk_evidence_immutable before update or delete on public.risk_evidence for each row execute function public.security_immutable();

create or replace function public.reloo_assert_active(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from profiles where id=p_profile_id and status='active' and activation_status='ACTIVE' and screening_valid_until > now())
    or exists (select 1 from risk_cases where profile_id=p_profile_id and status <> 'CLEARED') then
    raise exception 'ACCOUNT_RESTRICTED' using errcode='42501';
  end if;
end; $$;

create or replace function public.reloo_record_screening(p_profile_id text,p_status text,p_results jsonb,p_ip_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_check uuid; v_case uuid; v_activation text;
begin
  perform 1 from profiles where id=p_profile_id for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if p_status not in ('MATCH','NO_MATCH','UNKNOWN','UNAVAILABLE','STALE') then raise exception 'INVALID_STATUS'; end if;
  -- NO_MATCH is only allowed with complete, fresh source responses.
  if p_status='NO_MATCH' and (jsonb_array_length(p_results)=0 or exists (
    select 1 from jsonb_array_elements(p_results) r where r->>'status' <> 'NO_MATCH' or coalesce((r->>'complete')::boolean,false)=false or coalesce((r->>'expiresAt')::timestamptz,'-infinity'::timestamptz) <= now()
  )) then raise exception 'INCOMPLETE_SCREENING'; end if;
  insert into phone_screening_checks(profile_id,result,source_results,ip_hash) values(p_profile_id,p_status,p_results,p_ip_hash) returning id into v_check;
  select id into v_case from risk_cases where profile_id=p_profile_id and status <> 'CLEARED' for update;
  v_activation := case when p_status='NO_MATCH' and v_case is null then 'ACTIVE'
    when p_status='MATCH' or exists(select 1 from risk_cases where id=v_case and reason='MATCH') or exists(select 1 from profiles where id=p_profile_id and activation_status='RESTRICTED') then 'RESTRICTED'
    else 'PENDING' end;
  update profiles set phone_screening_status=p_status,activation_status=v_activation,
    screening_valid_until=case when v_activation='ACTIVE' then (select min((r->>'expiresAt')::timestamptz) from jsonb_array_elements(p_results) r) else null end,
    verification_method=case when v_activation='ACTIVE' then 'SOURCE_SCREENING' else null end where id=p_profile_id;
  if v_activation <> 'ACTIVE' and v_case is null then
    insert into risk_cases(profile_id,check_id,reason) values(p_profile_id,v_check,p_status) returning id into v_case;
  end if;
  insert into security_audit(subject_id,action,details) values(p_profile_id,'PHONE_SCREENED',jsonb_build_object('status',p_status,'checkId',v_check,'caseId',v_case,'activation',v_activation));
  return jsonb_build_object('activation_status',v_activation,'case_id',v_case);
end; $$;

create or replace function public.reloo_review_case(p_actor_id text,p_case_id uuid,p_action text,p_reason text,p_evidence jsonb,p_valid_hours integer default 720)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_case risk_cases; v_item jsonb;
begin
  perform reloo_assert_active(p_actor_id);
  if not exists(select 1 from profiles where id=p_actor_id and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_case from risk_cases where id=p_case_id for update;
  if not found or v_case.status='CLEARED' then raise exception 'CASE_NOT_OPEN'; end if;
  if length(trim(p_reason)) < 20 or p_action not in ('VERIFY','RESTRICT','CLEAR') then raise exception 'REASON_REQUIRED'; end if;
  if p_action='CLEAR' and (jsonb_array_length(p_evidence)=0 or p_valid_hours < 1 or p_valid_hours > 720) then raise exception 'VERIFICATION_EVIDENCE_REQUIRED'; end if;
  for v_item in select * from jsonb_array_elements(p_evidence) loop
    if coalesce(v_item->>'url','') !~ '^https://' or length(coalesce(v_item->>'note','')) < 10 then raise exception 'INVALID_EVIDENCE'; end if;
    insert into risk_evidence(case_id,source,evidence_url,note,submitted_by) values(p_case_id,coalesce(v_item->>'source','admin_review'),v_item->>'url',v_item->>'note',p_actor_id);
  end loop;
  update risk_cases set status=case p_action when 'CLEAR' then 'CLEARED' when 'VERIFY' then 'VERIFYING' else 'RESTRICTED' end,reviewed_by=p_actor_id,updated_at=now() where id=p_case_id;
  update profiles set activation_status=case when p_action='CLEAR' then 'ACTIVE' else 'RESTRICTED' end,
    screening_valid_until=case when p_action='CLEAR' then now()+make_interval(hours=>p_valid_hours) else null end,
    verification_method=case when p_action='CLEAR' then 'ADMIN_REVIEW' else null end where id=v_case.profile_id;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor_id,v_case.profile_id,'RISK_CASE_'||p_action,jsonb_build_object('caseId',p_case_id,'reason',p_reason,'evidence',p_evidence,'validHours',p_valid_hours));
  return jsonb_build_object('ok',true,'case_id',p_case_id);
end; $$;

create or replace function public.reloo_submit_appeal(p_profile_id text,p_case_id uuid,p_explanation text,p_evidence jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform 1 from risk_cases where id=p_case_id and profile_id=p_profile_id and status <> 'CLEARED' for update;
  if not found or length(trim(p_explanation)) < 20 then raise exception 'APPEAL_NOT_ALLOWED'; end if;
  insert into risk_appeals(case_id,profile_id,explanation,evidence) values(p_case_id,p_profile_id,p_explanation,p_evidence) returning id into v_id;
  update risk_cases set status='APPEALED',updated_at=now() where id=p_case_id;
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile_id,p_profile_id,'APPEAL_SUBMITTED',jsonb_build_object('caseId',p_case_id,'appealId',v_id));
  return v_id;
end; $$;

create or replace function public.reloo_asset_gate() returns trigger language plpgsql as $$
begin perform public.reloo_assert_active(new.owner_id); return new; end; $$;
drop trigger if exists reloo_asset_activation_gate on public.assets;
create trigger reloo_asset_activation_gate before insert or update on public.assets for each row execute function public.reloo_asset_gate();

alter table public.chat_messages drop constraint if exists chat_messages_message_type_check;
alter table public.chat_messages add constraint chat_messages_message_type_check check (message_type in ('text','system','image','audio','video','location'));
create or replace function public.reloo_send_message(p_profile_id text,p_thread_id text,p_message jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id text; v_created timestamptz; v_thread chat_threads;
begin
  perform reloo_assert_active(p_profile_id);
  select * into v_thread from chat_threads where id=p_thread_id for update;
  if not found or p_profile_id not in (v_thread.lender_id,v_thread.buyer_id) then raise exception 'THREAD_ACCESS_DENIED'; end if;
  if p_message->>'type' not in ('text','image','audio','video','location') then raise exception 'INVALID_MESSAGE'; end if;
  v_id := coalesce(nullif(p_message->>'id',''),gen_random_uuid()::text);
  if exists (select 1 from chat_messages where id=v_id and thread_id=p_thread_id and sender_id=p_profile_id) then
    return (select message_data || jsonb_build_object('id',id,'type',message_type,'text',body,'senderId',sender_id,'createdAt',created_at,'readBy',read_by) from chat_messages where id=v_id);
  end if;
  v_created := now();
  insert into chat_messages(id,thread_id,sender_id,message_type,body,message_data,created_at)
    values(v_id,p_thread_id,p_profile_id,p_message->>'type',p_message->>'text',p_message - 'senderId' - 'createdAt' - 'readBy',v_created);
  update chat_threads set updated_at=v_created where id=p_thread_id;
  return (p_message - 'senderId' - 'createdAt' - 'readBy') || jsonb_build_object('id',v_id,'senderId',p_profile_id,'createdAt',v_created,'readBy','[]'::jsonb);
end; $$;

create or replace function public.reloo_create_inquiry(p_profile_id text,p_listing_id text,p_message jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_listing assets; v_thread_id text; v_message jsonb;
begin
  perform reloo_assert_active(p_profile_id);
  select * into v_listing from assets where id=p_listing_id and status in ('available','rented') and not is_locked;
  if not found or v_listing.owner_id=p_profile_id then raise exception 'LISTING_NOT_AVAILABLE'; end if;
  perform reloo_assert_active(v_listing.owner_id);
  v_thread_id := 'inquiry_' || p_listing_id || '_' || p_profile_id;
  insert into chat_threads(id,listing_id,lender_id,buyer_id) values(v_thread_id,p_listing_id,v_listing.owner_id,p_profile_id) on conflict(id) do nothing;
  v_message := reloo_send_message(p_profile_id,v_thread_id,p_message);
  return jsonb_build_object('threadId',v_thread_id,'message',v_message,'lenderId',v_listing.owner_id,'buyerId',p_profile_id,'listingId',p_listing_id);
end; $$;

create table if not exists public.shipping_shipments (
  label_id text primary key, profile_id text not null references public.profiles(id), partner_id text unique not null,
  status_id integer, action_time timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.shipping_webhook_events (
  id text primary key, label_id text not null references public.shipping_shipments(label_id),
  status_id integer not null, action_time timestamptz not null, payload jsonb not null,
  created_at timestamptz not null default now()
);
create or replace function public.reloo_ghtk_event(p_event_id text,p_payload jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare v_time timestamptz; v_label text;
begin
  v_label := p_payload->>'label_id'; v_time := (p_payload->>'action_time')::timestamptz;
  perform 1 from shipping_shipments where label_id=v_label and partner_id=p_payload->>'partner_id' for update;
  if not found then raise exception 'UNKNOWN_SHIPMENT'; end if;
  insert into shipping_webhook_events(id,label_id,status_id,action_time,payload) values(p_event_id,v_label,(p_payload->>'status_id')::integer,v_time,p_payload) on conflict(id) do nothing;
  if not found then return false; end if;
  -- Shipper advisory codes are evidence, not canonical shipment states.
  if (p_payload->>'status_id')::integer not in (123,127,128,45,49,410) then
    update shipping_shipments set status_id=(p_payload->>'status_id')::integer,action_time=v_time where label_id=v_label and (action_time is null or action_time < v_time);
  end if;
  return true;
end; $$;

create table if not exists public.affiliate_clicks (
  id uuid primary key, profile_id text not null references public.profiles(id), merchant text not null,
  original_url text not null, affiliate_url text not null, provider text not null default 'accesstrade',
  reward_share numeric(4,3) not null check(reward_share between 0 and 1),
  created_at timestamptz not null default now()
);
create table if not exists public.cashback_conversions (
  id text primary key, click_id uuid not null references public.affiliate_clicks(id),
  merchant text not null, provider_order_id text not null, status text not null check(status in ('PENDING','APPROVED','REJECTED')),
  commission bigint not null check(commission>=0), reward bigint not null check(reward>=0),
  provider_updated_at timestamptz not null, created_at timestamptz not null default now(),
  unique(merchant,provider_order_id)
);
create table if not exists public.cashback_ledger (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  conversion_id text not null references public.cashback_conversions(id), amount bigint not null,
  event_type text not null check(event_type in ('APPROVED','REVERSED')), created_at timestamptz not null default now(), unique(conversion_id,event_type)
);
create table if not exists public.affiliate_products (
  id text primary key, merchant text not null, title text not null, image_url text, original_url text not null,
  price bigint, commission_rate numeric, source text not null default 'accesstrade', source_updated_at timestamptz not null, visible boolean not null default true
);
drop trigger if exists cashback_ledger_immutable on public.cashback_ledger;
create trigger cashback_ledger_immutable before update or delete on public.cashback_ledger for each row execute function public.security_immutable();

alter table public.cashback_ledger drop constraint if exists cashback_ledger_event_type_check;
alter table public.cashback_ledger add constraint cashback_ledger_event_type_check check(event_type in ('APPROVED','REVERSED','ADJUSTED'));
alter table public.cashback_ledger drop constraint if exists cashback_ledger_conversion_id_event_type_key;
alter table public.cashback_ledger add column if not exists provider_updated_at timestamptz;
create unique index if not exists cashback_ledger_event_version on public.cashback_ledger(conversion_id,provider_updated_at);

create or replace function public.reloo_normalize_phone(p_phone text) returns text language plpgsql immutable as $$
declare v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_phone,''),'[\s().-]','','g');
  if left(v_phone,3)='+84' then v_phone := '0'||substring(v_phone from 4);
  elsif left(v_phone,2)='84' and length(v_phone)=11 then v_phone := '0'||substring(v_phone from 3); end if;
  return case when v_phone ~ '^0[35789][0-9]{8}$' then v_phone else null end;
end; $$;

create or replace function public.reloo_add_phone_signal(p_actor_id text,p_phone text,p_source text,p_url text,p_note text,p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_profile profiles; v_results jsonb;
begin
  perform reloo_assert_active(p_actor_id);
  if not exists(select 1 from profiles where id=p_actor_id and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_phone !~ '^0[35789][0-9]{8}$' or p_url !~ '^https://' or length(p_note)<20 or p_expires_at <= now() or p_expires_at > now()+interval '30 days' then raise exception 'INVALID_SIGNAL'; end if;
  insert into phone_risk_signals(phone,source,evidence_url,evidence_note,expires_at,created_by) values(p_phone,p_source,p_url,p_note,p_expires_at,p_actor_id) returning id into v_id;
  v_results := jsonb_build_array(jsonb_build_object('source','reviewed_evidence','origin',p_source,'status','MATCH','expiresAt',p_expires_at,'evidence',jsonb_build_array(jsonb_build_object('id',v_id,'url',p_url,'note',p_note))));
  for v_profile in select * from profiles where reloo_normalize_phone(phone)=p_phone loop perform reloo_record_screening(v_profile.id,'MATCH',v_results,null); end loop;
  insert into security_audit(actor_id,action,details) values(p_actor_id,'PHONE_SIGNAL_RECORDED',jsonb_build_object('signalId',v_id,'source',p_source,'expiresAt',p_expires_at,'url',p_url));
  return v_id;
end; $$;

create or replace function public.reloo_add_ip_signal(p_actor_id text,p_check_id uuid,p_scope text,p_reason text,p_hours integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_check phone_screening_checks; v_id uuid;
begin
  perform reloo_assert_active(p_actor_id);
  if not exists(select 1 from profiles where id=p_actor_id and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_check from phone_screening_checks where id=p_check_id;
  if not found or v_check.ip_hash is null or p_hours<1 or p_hours>24 or length(p_reason)<20 then raise exception 'INVALID_IP_SCOPE'; end if;
  insert into scoped_ip_signals(ip_hash,profile_id,scope,reason,created_by,expires_at) values(v_check.ip_hash,v_check.profile_id,p_scope,p_reason,p_actor_id,now()+make_interval(hours=>p_hours)) returning id into v_id;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor_id,v_check.profile_id,'SCOPED_IP_SIGNAL',jsonb_build_object('signalId',v_id,'scope',p_scope,'hours',p_hours,'reason',p_reason));
  return v_id;
end; $$;

create or replace function public.reloo_sync_cashback(p_id text,p_click_id uuid,p_merchant text,p_order_id text,p_status text,p_commission bigint,p_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_click affiliate_clicks; v_old cashback_conversions; v_reward bigint; v_balance bigint; v_delta bigint;
begin
  select * into v_click from affiliate_clicks where id=p_click_id for update;
  if not found then return false; end if;
  if p_status not in ('PENDING','APPROVED','REJECTED') or p_commission<0 or p_merchant not like '%'||v_click.merchant||'%' then raise exception 'INVALID_CONVERSION'; end if;
  select * into v_old from cashback_conversions where id=p_id for update;
  if found and (v_old.click_id<>p_click_id or v_old.provider_updated_at >= p_updated_at) then return false; end if;
  v_reward := floor(p_commission*v_click.reward_share);
  insert into cashback_conversions(id,click_id,merchant,provider_order_id,status,commission,reward,provider_updated_at)
    values(p_id,p_click_id,p_merchant,p_order_id,p_status,p_commission,v_reward,p_updated_at)
    on conflict(id) do update set status=excluded.status,commission=excluded.commission,reward=excluded.reward,provider_updated_at=excluded.provider_updated_at;
  select coalesce(sum(amount),0) into v_balance from cashback_ledger where conversion_id=p_id;
  v_delta := (case when p_status='APPROVED' then v_reward else 0 end)-v_balance;
  if v_delta <> 0 then
    insert into cashback_ledger(profile_id,conversion_id,amount,event_type,provider_updated_at)
      values(v_click.profile_id,p_id,v_delta,case when v_delta<0 then 'REVERSED' when v_balance=0 then 'APPROVED' else 'ADJUSTED' end,p_updated_at);
  end if;
  insert into security_audit(subject_id,action,details) values(v_click.profile_id,'CASHBACK_RECONCILED',jsonb_build_object('conversionId',p_id,'status',p_status,'delta',v_delta,'providerUpdatedAt',p_updated_at));
  return true;
end; $$;

do $$ declare t text; begin
  foreach t in array array['phone_risk_signals','phone_screening_checks','risk_cases','risk_evidence','risk_appeals','security_audit','scoped_ip_signals','shipping_shipments','shipping_webhook_events','affiliate_clicks','cashback_conversions','cashback_ledger','affiliate_products'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end; $$;
-- Browser/mobile clients must use the same backend gates. No direct RPC bypass.
revoke all on function public.reloo_assert_active(text) from public,anon,authenticated;
revoke all on function public.reloo_record_screening(text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.reloo_review_case(text,uuid,text,text,jsonb,integer) from public,anon,authenticated;
revoke all on function public.reloo_submit_appeal(text,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.reloo_send_message(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.reloo_create_inquiry(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.reloo_ghtk_event(text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_assert_active(text),public.reloo_record_screening(text,text,jsonb,text),public.reloo_review_case(text,uuid,text,text,jsonb,integer),public.reloo_submit_appeal(text,uuid,text,jsonb),public.reloo_send_message(text,text,jsonb),public.reloo_create_inquiry(text,text,jsonb),public.reloo_ghtk_event(text,jsonb) to service_role;
revoke all on function public.reloo_add_phone_signal(text,text,text,text,text,timestamptz),public.reloo_add_ip_signal(text,uuid,text,text,integer),public.reloo_sync_cashback(text,uuid,text,text,text,bigint,timestamptz) from public,anon,authenticated;
grant execute on function public.reloo_add_phone_signal(text,text,text,text,text,timestamptz),public.reloo_add_ip_signal(text,uuid,text,text,integer),public.reloo_sync_cashback(text,uuid,text,text,text,bigint,timestamptz) to service_role;
