create table if not exists public.smart_key_sessions(id uuid primary key,profile_id text not null references profiles(id),auth_session_id uuid not null,expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now());
alter table smart_key_sessions enable row level security;
revoke all on smart_key_sessions from public,anon,authenticated;
grant all on smart_key_sessions to service_role;
create or replace function public.reloo_consume_smart_key(p_actor text,p_receipt uuid) returns void language plpgsql security definer set search_path=public as $$begin
 update smart_key_sessions set revoked_at=now() where id=p_receipt and profile_id=p_actor and revoked_at is null and expires_at>now();if not found then raise exception 'SMART_KEY_REQUIRED';end if;
end$$;
revoke all on function reloo_consume_smart_key(text,uuid) from public,anon,authenticated;
grant execute on function reloo_consume_smart_key(text,uuid) to service_role;
notify pgrst,'reload schema';
