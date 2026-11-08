begin;
alter table public.news_autopilot_settings alter column source_max_age_hours set default 168;
update public.news_autopilot_settings set source_max_age_hours=168,updated_at=now() where id=true;
update public.news_autopilot_candidates set status='EXPIRED',reason='NEWS_SOURCE_STALE',updated_at=now()
where status in ('NEW','READY','HELD') and (source_published_at is null or source_published_at<now()-interval '7 days' or source_published_at>now()+interval '5 minutes');
-- Always recheck at publication, including already-generated candidates.
create or replace function public.reloo_guard_news_freshness() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status='PUBLISHED' and (tg_op='INSERT' or old.status is distinct from 'PUBLISHED') and
 (new.source_published_at is null or new.source_published_at<now()-interval '7 days' or new.source_published_at>now()+interval '5 minutes') then raise exception 'NEWS_SOURCE_STALE';end if;
 return new;
end $$;
drop trigger if exists news_candidate_freshness_guard on public.news_autopilot_candidates;
create trigger news_candidate_freshness_guard before insert or update on public.news_autopilot_candidates for each row execute function public.reloo_guard_news_freshness();
revoke all on function public.reloo_guard_news_freshness() from public,anon,authenticated;
commit;
