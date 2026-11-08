create table if not exists public.finance_webhook_inbox (
  id uuid primary key default gen_random_uuid(), provider_event_id text not null unique,
  body_hash text not null, payload_encrypted text not null,
  status text not null default 'QUEUED' check(status in ('QUEUED','VERIFIED','REVIEW')),
  result_code text, created_at timestamptz not null default now(), verified_at timestamptz
);
create table if not exists public.finance_sources (
  id uuid primary key default gen_random_uuid(), provider text not null check(provider='SEPAY'),
  provider_id text not null unique, bank_account_id text not null,
  direction text not null check(direction in ('IN','OUT')), amount bigint not null check(amount>0 and amount<=9007199254740991),
  currency text not null default 'VND' check(currency='VND'), reference_hash text not null,
  occurred_at timestamptz not null,
  evidence_encrypted text not null, evidence_envelope jsonb not null, evidence_hash text not null,
  signature text not null, signing_key_id text not null,
  inbox_id uuid not null references public.finance_webhook_inbox(id), verified_at timestamptz not null default now()
);
create table if not exists public.ledger_accounts (
  code text primary key, name text not null, category text not null
);
insert into public.ledger_accounts(code,name,category) values
('1121','Tiền gửi ngân hàng','ASSET'),('1388','Khoản chi chờ đối chiếu','ASSET'),('3388','Khoản thu chờ đối chiếu','LIABILITY'),
('5113','Doanh thu dịch vụ của RELOO','REVENUE'),('3331','Thuế GTGT phải nộp','TAX'),('641','Chi phí bán hàng','EXPENSE') on conflict do nothing;
create table if not exists public.ledger_journals (
  id uuid primary key default gen_random_uuid(), source_id uuid not null unique references public.finance_sources(id),
  title text not null, status text not null default 'POSTED' check(status='POSTED'), created_at timestamptz not null default now()
);
create table if not exists public.ledger_lines (
  id uuid primary key default gen_random_uuid(), journal_id uuid not null references public.ledger_journals(id),
  account_code text not null references public.ledger_accounts(code), side text not null check(side in ('DEBIT','CREDIT')),
  amount bigint not null check(amount>0 and amount<=9007199254740991), profile_id text references public.profiles(id)
);
create table if not exists public.invoice_documents (
  id uuid primary key default gen_random_uuid(), reference_code uuid not null unique default gen_random_uuid(),
  seller_entity_version integer not null, seller_snapshot jsonb not null, source_journal_id uuid references public.ledger_journals(id),
  data_encrypted text not null, subtotal bigint not null check(subtotal>=0), tax bigint not null check(tax>=0), total bigint not null check(total=subtotal+tax),
  status text not null default 'DRAFT' check(status in ('DRAFT','REVIEW','CREATING','CREATED','ISSUING','ISSUED','FAILED','UNKNOWN')),
  provider_tracking text, provider_issue_tracking text, provider_evidence_encrypted text,
  created_by text not null references public.profiles(id), approved_by text references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text;begin
  foreach t in array array['finance_webhook_inbox','finance_sources','ledger_accounts','ledger_journals','ledger_lines','invoice_documents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
create or replace function public.reloo_immutable_record() returns trigger language plpgsql as $$
begin raise exception 'IMMUTABLE_RECORD_APPEND_CORRECTION';end $$;
drop trigger if exists finance_source_immutable on public.finance_sources;
create trigger finance_source_immutable before update or delete on public.finance_sources for each row execute function public.reloo_immutable_record();
drop trigger if exists ledger_journal_immutable on public.ledger_journals;
create trigger ledger_journal_immutable before update or delete on public.ledger_journals for each row execute function public.reloo_immutable_record();
drop trigger if exists ledger_line_immutable on public.ledger_lines;
create trigger ledger_line_immutable before update or delete on public.ledger_lines for each row execute function public.reloo_immutable_record();
create or replace function public.reloo_check_journal_balance() returns trigger language plpgsql as $$
declare journal uuid;total_debit numeric;total_credit numeric;source_amount bigint;n integer;
begin
  if tg_table_name='ledger_journals' then journal:=new.id;else journal:=new.journal_id;end if;
  select coalesce(sum(amount) filter(where side='DEBIT'),0),coalesce(sum(amount) filter(where side='CREDIT'),0),count(*) into total_debit,total_credit,n from ledger_lines where journal_id=journal;
  select s.amount into source_amount from ledger_journals j join finance_sources s on s.id=j.source_id where j.id=journal;
  if n<2 or total_debit<>total_credit or total_debit>9007199254740991 or total_debit<>source_amount then raise exception 'JOURNAL_NOT_BALANCED';end if;
  return null;
end $$;
drop trigger if exists journal_balance_at_commit on public.ledger_journals;
create constraint trigger journal_balance_at_commit after insert on public.ledger_journals deferrable initially deferred for each row execute function public.reloo_check_journal_balance();
drop trigger if exists line_balance_at_commit on public.ledger_lines;
create constraint trigger line_balance_at_commit after insert on public.ledger_lines deferrable initially deferred for each row execute function public.reloo_check_journal_balance();
create or replace function public.reloo_receive_sepay(p_event text,p_hash text,p_payload text) returns uuid
language plpgsql security definer set search_path=public as $$
declare item finance_webhook_inbox;
begin
  perform pg_advisory_xact_lock(hashtext('sepay:'||p_event));
  select * into item from finance_webhook_inbox where provider_event_id=p_event;
  if found then if item.body_hash<>p_hash then raise exception 'WEBHOOK_CONTENT_CONFLICT';end if;return item.id;end if;
  if p_hash!~'^[a-f0-9]{64}$' or length(p_payload)<20 then raise exception 'INVALID_WEBHOOK';end if;
  insert into finance_webhook_inbox(provider_event_id,body_hash,payload_encrypted) values(p_event,p_hash,p_payload) returning * into item;
  insert into automation_jobs(kind,payload) values('VERIFY_SEPAY',jsonb_build_object('inboxId',item.id));
  return item.id;
end $$;
create or replace function public.reloo_post_sepay(p_inbox uuid,p_source uuid,p_verified jsonb,p_evidence text,p_envelope jsonb,p_hash text,p_signature text,p_key_id text) returns uuid
language plpgsql security definer set search_path=public as $$
declare source finance_sources;v_amount bigint;v_journal uuid;
begin
  perform 1 from finance_webhook_inbox where id=p_inbox for update;
  if not found then raise exception 'INBOX_REQUIRED';end if;
  v_amount:=(p_verified->>'amount')::bigint;
  if v_amount<=0 or v_amount>9007199254740991 or p_verified->>'type' not in ('in','out') or p_verified->>'providerId'!~'^[a-f0-9-]{36}$' or p_hash!~'^[a-f0-9]{64}$' or length(p_signature)<>88 or p_key_id!~'^[a-f0-9]{64}$' then raise exception 'VERIFIED_SOURCE_REQUIRED';end if;
  perform pg_advisory_xact_lock(hashtext('sepay-source:'||(p_verified->>'providerId')));
  select * into source from finance_sources where provider_id=p_verified->>'providerId';
  if found then
    if source.amount<>v_amount or source.direction<>upper(p_verified->>'type') or source.bank_account_id<>p_verified->>'accountId' then raise exception 'PROVIDER_SOURCE_CHANGED';end if;
    update finance_webhook_inbox set status='VERIFIED',verified_at=now() where id=p_inbox;
    return (select id from ledger_journals where source_id=source.id);
  end if;
  insert into finance_sources(id,provider,provider_id,bank_account_id,direction,amount,reference_hash,occurred_at,evidence_encrypted,evidence_envelope,evidence_hash,signature,signing_key_id,inbox_id)
  values(p_source,'SEPAY',p_verified->>'providerId',p_verified->>'accountId',upper(p_verified->>'type'),v_amount,p_verified->>'referenceHash',(p_verified->>'occurredAt')::timestamptz,p_evidence,p_envelope,p_hash,p_signature,p_key_id,p_inbox);
  insert into ledger_journals(source_id,title) values(p_source,case when p_verified->>'type'='in' then 'Khoản thu ngân hàng chờ đối chiếu' else 'Khoản chi ngân hàng chờ đối chiếu' end) returning id into v_journal;
  if p_verified->>'type'='in' then
    insert into ledger_lines(journal_id,account_code,side,amount) values(v_journal,'1121','DEBIT',v_amount),(v_journal,'3388','CREDIT',v_amount);
  else
    insert into ledger_lines(journal_id,account_code,side,amount) values(v_journal,'1388','DEBIT',v_amount),(v_journal,'1121','CREDIT',v_amount);
  end if;
  update finance_webhook_inbox set status='VERIFIED',verified_at=now() where id=p_inbox;
  insert into security_audit(action,details) values('BANK_SOURCE_VERIFIED',jsonb_build_object('sourceId',p_source,'journalId',v_journal,'provider','SEPAY'));
  return v_journal;
end $$;
revoke all on function public.reloo_receive_sepay(text,text,text),public.reloo_post_sepay(uuid,uuid,jsonb,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.reloo_receive_sepay(text,text,text),public.reloo_post_sepay(uuid,uuid,jsonb,text,jsonb,text,text,text) to service_role;
notify pgrst,'reload schema';
