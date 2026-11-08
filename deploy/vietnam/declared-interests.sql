-- Explicit product choices are separate from consent to learn from behavior.
create table if not exists public.pp_declared_interests(
 profile_id text primary key references public.profiles(id) on delete cascade,
 categories text[] not null default '{}',revision integer not null default 1,
 notice_version text not null default 'RELOO_INTERESTS_V1',
 seen_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint declared_interests_limit check(cardinality(categories)<=5)
);
create or replace function public.reloo_pp_declared_set(p_actor text,p_categories text[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare result pp_declared_interests;
begin
 perform pg_advisory_xact_lock(hashtextextended('pp:'||p_actor,0));
 if not exists(select 1 from profiles where id=p_actor and deleted_at is null) or p_categories is null or cardinality(p_categories)>5 or exists(select 1 from unnest(p_categories) c where c is null or c!~'^[a-z0-9-]{2,60}$') then raise exception 'INVALID_INPUT';end if;
 insert into pp_declared_interests(profile_id,categories) values(p_actor,p_categories)
 on conflict(profile_id) do update set categories=excluded.categories,revision=pp_declared_interests.revision+1,updated_at=now()
 returning * into result;return to_jsonb(result);
end $$;
create or replace function public.reloo_pp_declared_context(p_actor text) returns jsonb language plpgsql security definer set search_path=public as $$
declare base jsonb;pref pp_declared_interests;
begin
 base:=reloo_pp_context(p_actor);select * into pref from pp_declared_interests where profile_id=p_actor;
 return base||jsonb_build_object('manualCategories',case when pref.profile_id is not null then to_jsonb(pref.categories) else null end,'categories',case when pref.profile_id is not null then to_jsonb(pref.categories) else base->'categories' end,'onboardingSeen',pref.profile_id is not null or coalesce((base->>'enabled')::boolean,false),'revision',coalesce((base->>'revision')::integer,1)+coalesce(pref.revision,0));
end $$;
create or replace function public.reloo_pp_declared_preferences(p_actor text,p_enabled boolean,p_categories text[],p_reset boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 perform reloo_pp_declared_set(p_actor,case when p_reset then '{}'::text[] else p_categories end);
 perform reloo_pp_preferences(p_actor,p_enabled,p_categories,p_reset);
 return reloo_pp_declared_context(p_actor);
end $$;
create or replace function public.reloo_pp_declared_clear(p_actor text,p_all boolean) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 perform reloo_pp_clear(p_actor,p_all);
 if p_all then perform reloo_pp_declared_set(p_actor,'{}');end if;
 return reloo_pp_declared_context(p_actor);
end $$;
create or replace function public.reloo_pp_declared_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.deleted_at is not null then delete from pp_declared_interests where profile_id=new.id;end if;return new;end $$;
drop trigger if exists reloo_pp_declared_delete on public.profiles;
create trigger reloo_pp_declared_delete after update of deleted_at on public.profiles for each row execute function public.reloo_pp_declared_delete();
revoke all on public.pp_declared_interests from PUBLIC,anon,authenticated;
revoke all on function public.reloo_pp_declared_set(text,text[]),public.reloo_pp_declared_context(text),public.reloo_pp_declared_preferences(text,boolean,text[],boolean),public.reloo_pp_declared_clear(text,boolean),public.reloo_pp_declared_delete() from PUBLIC,anon,authenticated;
grant select,insert,update,delete on public.pp_declared_interests to service_role;
grant execute on function public.reloo_pp_declared_set(text,text[]),public.reloo_pp_declared_context(text),public.reloo_pp_declared_preferences(text,boolean,text[],boolean),public.reloo_pp_declared_clear(text,boolean) to service_role;
