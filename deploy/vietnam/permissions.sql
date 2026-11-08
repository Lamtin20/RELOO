-- Private profile details are available only through the application's scoped backend.
revoke select on public.profiles from anon,authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
create or replace function public.reloo_assert_active(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from profiles where id=p_profile_id and status='active' and activation_status='ACTIVE' and screening_valid_until>now() and reloo_normalize_phone(phone) is not null)
    or exists(select 1 from risk_cases where profile_id=p_profile_id and status<>'CLEARED')
    or exists(select 1 from risk_blacklist where profile_id=p_profile_id and status<>'CLEARED' and (expires_at is null or expires_at>now())) then
    raise exception 'ACCOUNT_RESTRICTED' using errcode='42501';
  end if;
end; $$;
revoke all on function public.reloo_assert_active(text) from public,anon,authenticated;
grant execute on function public.reloo_assert_active(text) to service_role;
notify pgrst,'reload schema';
