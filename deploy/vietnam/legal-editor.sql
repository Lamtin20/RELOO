create table if not exists public.legal_content_drafts(slug text primary key,content jsonb not null,version integer not null default 1,updated_at timestamptz not null default now(),updated_by text references profiles(id));
alter table public.legal_content_drafts enable row level security;
revoke all on public.legal_content_drafts from public,anon,authenticated;
grant all on public.legal_content_drafts to service_role;
create or replace function public.reloo_edit_legal(p_actor text,p_slug text,p_content jsonb,p_version integer) returns integer
language plpgsql security definer set search_path=public as $$
declare next_version integer;
begin
 if not reloo_staff_permission(p_actor,'legal.write') then raise exception 'PERMISSION_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('legal:'||p_slug));
 if coalesce((select version from legal_content_drafts where slug=p_slug),0)<>p_version then raise exception 'VERSION_CONFLICT';end if;
 next_version=p_version+1;
 insert into legal_content_drafts(slug,content,version,updated_by) values(p_slug,p_content,next_version,p_actor)
 on conflict(slug) do update set content=excluded.content,version=excluded.version,updated_at=now(),updated_by=p_actor;
 insert into security_audit(actor_id,action,details) values(p_actor,'LEGAL_CONTENT_EDITED',jsonb_build_object('slug',p_slug,'version',next_version));
 return next_version;
end $$;
revoke all on function public.reloo_edit_legal(text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.reloo_edit_legal(text,text,jsonb,integer) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_publish_legal_checked(p_actor text,p_hash text,p_document jsonb,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not reloo_staff_permission(p_actor,'legal.write') then raise exception 'PERMISSION_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtext('legal:'||(p_document->>'slug')));
 if coalesce((select version from legal_content_drafts where slug=p_document->>'slug'),0)<>coalesce((p_document->>'contentVersion')::integer,0) then raise exception 'VERSION_CONFLICT';end if;
 perform reloo_publish_legal(p_actor,p_hash,p_document,p_reason);
end $$;
revoke all on function public.reloo_publish_legal_checked(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.reloo_publish_legal_checked(text,text,jsonb,text) to service_role;
create or replace function public.reloo_publish_legal_batch(p_actor text,p_documents jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare item jsonb;
begin
 if not reloo_staff_permission(p_actor,'legal.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if jsonb_typeof(p_documents)<>'array' or jsonb_array_length(p_documents)<1 or jsonb_array_length(p_documents)>5 then raise exception 'INVALID_BATCH';end if;
 for item in select value from jsonb_array_elements(p_documents) loop
 perform reloo_publish_legal_checked(p_actor,item->>'hash',item->'document','Ban hanh nhom tai lieu trong phien CRM da xac thuc.');
 end loop;
end $$;
revoke all on function public.reloo_publish_legal_batch(text,jsonb) from public,anon,authenticated;
grant execute on function public.reloo_publish_legal_batch(text,jsonb) to service_role;
