create table if not exists public.legal_document_versions (
  hash text primary key check(hash~'^[a-f0-9]{64}$'),slug text not null,template_version text not null,
  entity_version integer not null,snapshot jsonb not null,created_at timestamptz not null default now()
);
create table if not exists public.legal_publications (
  slug text primary key,document_hash text not null references public.legal_document_versions(hash),
  approved_by text not null references public.profiles(id),reason text not null,published_at timestamptz not null default now()
);
create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),profile_id text not null references public.profiles(id),
  document_hash text not null references public.legal_document_versions(hash),context text not null,
  accepted_at timestamptz not null default now(),unique(profile_id,document_hash,context)
);
do $$declare t text;begin
  foreach t in array array['legal_document_versions','legal_publications','legal_acceptances'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
drop trigger if exists legal_version_immutable on public.legal_document_versions;
create trigger legal_version_immutable before update or delete on public.legal_document_versions for each row execute function public.reloo_immutable_record();
drop trigger if exists legal_acceptance_immutable on public.legal_acceptances;
create trigger legal_acceptance_immutable before update or delete on public.legal_acceptances for each row execute function public.reloo_immutable_record();
create or replace function public.reloo_publish_legal(p_actor text,p_hash text,p_document jsonb,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not reloo_staff_permission(p_actor,'legal.write') then raise exception 'PERMISSION_REQUIRED';end if;
  if length(trim(p_reason))<30 or not exists(select 1 from business_settings where id and version=(p_document->>'entityVersion')::integer) then raise exception 'REVIEW_OR_VERSION_REQUIRED';end if;
  insert into legal_document_versions(hash,slug,template_version,entity_version,snapshot) values(p_hash,p_document->>'slug',p_document->>'templateVersion',(p_document->>'entityVersion')::integer,p_document) on conflict do nothing;
  insert into legal_publications(slug,document_hash,approved_by,reason) values(p_document->>'slug',p_hash,p_actor,p_reason)
  on conflict(slug) do update set document_hash=p_hash,approved_by=p_actor,reason=p_reason,published_at=now();
  insert into security_audit(actor_id,action,details) values(p_actor,'LEGAL_DOCUMENT_PUBLISHED',jsonb_build_object('hash',p_hash,'slug',p_document->>'slug','reason',p_reason));
end $$;
create or replace function public.reloo_accept_legal(p_profile text,p_hash text,p_context text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from profiles where id=p_profile) or not exists(select 1 from legal_publications where document_hash=p_hash) or length(p_context)>100 then raise exception 'PUBLISHED_DOCUMENT_REQUIRED';end if;
  insert into legal_acceptances(profile_id,document_hash,context) values(p_profile,p_hash,p_context) on conflict do nothing;
end $$;
revoke all on function public.reloo_publish_legal(text,text,jsonb,text),public.reloo_accept_legal(text,text,text) from public,anon,authenticated;
grant execute on function public.reloo_publish_legal(text,text,jsonb,text),public.reloo_accept_legal(text,text,text) to service_role;
notify pgrst,'reload schema';
