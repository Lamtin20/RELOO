begin;
alter table public.profiles add column if not exists ui_locale text check(ui_locale in ('vi-VN','en-US'));
create or replace function public.reloo_ui_language_set(p_actor text,p_locale text,p_initial boolean default false) returns text language plpgsql security definer set search_path=public as $$
declare current_locale text;
begin
 if p_locale not in ('vi-VN','en-US') or p_locale is null then raise exception 'LOCALE_INVALID';end if;
 select ui_locale into current_locale from profiles where id=p_actor for update;
 if not found then raise exception 'PROFILE_REQUIRED';end if;
 if p_initial and current_locale is not null then return current_locale;end if;
 update profiles set ui_locale=p_locale where id=p_actor;
 if to_regclass('public.rc_preferences') is not null then execute 'insert into public.rc_preferences(profile_id,locale) values($1,$2) on conflict(profile_id) do update set locale=excluded.locale' using p_actor,p_locale;end if;
 if to_regclass('public.nk_preferences') is not null then execute 'insert into public.nk_preferences(profile_id,locale) values($1,$2) on conflict(profile_id) do update set locale=excluded.locale' using p_actor,p_locale;end if;
 return p_locale;
end $$;
revoke all on function public.reloo_ui_language_set(text,text,boolean) from public,anon,authenticated;
grant execute on function public.reloo_ui_language_set(text,text,boolean) to service_role;
commit;
