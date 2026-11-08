begin;
create or replace function reloo_account_unread(p_actor text) returns bigint language sql stable security definer set search_path=public as $$
 select count(*) from chat_messages m join chat_threads t on t.id=m.thread_id
 where p_actor is not null and p_actor in(t.lender_id,t.buyer_id) and m.sender_id<>p_actor
 and not coalesce(m.read_by,'[]'::jsonb) @> jsonb_build_array(p_actor)
$$;
revoke all on function reloo_account_unread(text) from public,anon,authenticated;
grant execute on function reloo_account_unread(text) to service_role;
commit;
