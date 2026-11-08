create table if not exists public.news_autopilot_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_target integer not null default 40 check(daily_target between 1 and 40),
 max_attempts_per_day integer not null default 60 check(max_attempts_per_day between 1 and 100),
 min_interval_minutes integer not null default 30 check(min_interval_minutes between 20 and 1440),
 source_max_age_hours integer not null default 168 check(source_max_age_hours between 1 and 168),
 provider text not null default 'LOCAL' check(provider in ('LOCAL','VIBI')),
 updated_at timestamptz not null default now(), updated_by text references public.profiles(id)
);
insert into public.news_autopilot_settings(id) values(true) on conflict do nothing;
alter table public.news_autopilot_settings add column if not exists enabled_topics text[] not null default array['PERSONAL_FINANCE','INVESTMENT_NEWS','CATALOG','RENT_BUY','RENT_BENEFITS','ENVIRONMENT'];
create table if not exists public.news_autopilot_sources (
 id text primary key, name text not null, feed_url text not null, allowed_hosts text[] not null,
 enabled boolean not null default true, last_checked_at timestamptz,last_error text,
 category text not null default 'Cập nhật thiết bị',keywords text[] not null default '{}'
);
create table if not exists public.news_autopilot_candidates (
 id uuid primary key default gen_random_uuid(),source_id text not null references news_autopilot_sources(id),
 canonical_url text not null unique,title text not null,source_published_at timestamptz not null,
 content_hash text, source_text text,source_title text,
 status text not null default 'NEW' check(status in ('NEW','GENERATING','READY','HELD','UNCERTAIN','PUBLISHED','EXPIRED')),
 generated jsonb,review jsonb,reason text,article_id uuid unique references news_articles(id),
 attempt_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.news_autopilot_sources add column if not exists topic text not null default 'CATALOG';
alter table public.news_autopilot_sources add column if not exists jurisdiction text;
create table if not exists public.news_autopilot_runs (
 id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,
 status text not null default 'RUNNING',summary jsonb not null default '{}',error_code text
);
create table if not exists public.news_autopilot_lease (
 id boolean primary key default true check(id),owner uuid,expires_at timestamptz
);
insert into news_autopilot_lease(id) values(true) on conflict do nothing;
create index if not exists news_autopilot_candidate_state on news_autopilot_candidates(status,source_published_at desc);
alter table news_autopilot_settings enable row level security;
alter table news_autopilot_sources enable row level security;
alter table news_autopilot_candidates enable row level security;
alter table news_autopilot_runs enable row level security;
alter table news_autopilot_lease enable row level security;
revoke all on news_autopilot_settings,news_autopilot_sources,news_autopilot_candidates,news_autopilot_runs,news_autopilot_lease from public,anon,authenticated;
grant all on news_autopilot_settings,news_autopilot_sources,news_autopilot_candidates,news_autopilot_runs,news_autopilot_lease to service_role;

create or replace function public.reloo_news_autopilot_lease(p_owner uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 update news_autopilot_lease set owner=p_owner,expires_at=now()+interval '20 minutes' where id and (expires_at is null or expires_at<now());
 return found;
end $$;
create or replace function public.reloo_publish_automatic_news(p_owner uuid,p_candidate uuid,p_article jsonb,p_media jsonb,p_source_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare settings news_autopilot_settings; candidate news_autopilot_candidates; published_id uuid; day_start timestamptz; published integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('reloo-news-autopilot-publish',0));
 select * into settings from news_autopilot_settings where id;
 if not settings.enabled then raise exception 'NEWS_AUTOPILOT_PAUSED';end if;
 if not exists(select 1 from news_autopilot_lease where id and owner=p_owner and expires_at>now())then raise exception 'NEWS_LEASE_EXPIRED';end if;
 select * into candidate from news_autopilot_candidates where id=p_candidate for update;
 if not found then raise exception 'NEWS_CANDIDATE_NOT_FOUND';end if;
 if candidate.article_id is not null then return candidate.article_id;end if;
 if not exists(select 1 from news_autopilot_sources s where s.id=candidate.source_id and s.enabled and s.topic=any(settings.enabled_topics))then raise exception 'NEWS_TOPIC_DISABLED';end if;
 if candidate.status is distinct from 'READY' or candidate.content_hash is distinct from p_source_hash or p_source_hash is null or candidate.review->>'decision' is distinct from 'PASS' or candidate.review->>'vietnameseClear' is distinct from 'true' or candidate.review->>'originalSummary' is distinct from 'true' or candidate.review->'unsupportedClaims' is distinct from '[]'::jsonb then raise exception 'NEWS_NOT_VERIFIED';end if;
 if candidate.source_published_at is null or candidate.source_published_at>now()+interval '5 minutes' or candidate.source_published_at<now()-make_interval(hours=>least(settings.source_max_age_hours,168)) then raise exception 'NEWS_SOURCE_STALE';end if;
 day_start=date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
 select count(*) into published from news_articles a join news_autopilot_candidates c on c.article_id=a.id where a.publish_at>=day_start and a.publish_at<day_start+interval '1 day';
 if published>=settings.daily_target then raise exception 'NEWS_DAILY_LIMIT';end if;
 if exists(select 1 from news_articles a join news_autopilot_candidates c on c.article_id=a.id where a.publish_at>now()-make_interval(mins=>settings.min_interval_minutes))then raise exception 'NEWS_INTERVAL_LIMIT';end if;
 if p_article->>'title' is null or length(p_article->>'title') not between 10 and 160 or p_article->>'body' is null or length(p_article->>'body') not between 1000 and 50000 or p_media->>'mime' is distinct from 'image/webp' then raise exception 'NEWS_PAYLOAD_INVALID';end if;
 if p_article->>'body' not like '%'||candidate.canonical_url||'%' then raise exception 'NEWS_ATTRIBUTION_REQUIRED';end if;
 insert into media_assets(id,filename,mime,width,height,bytes,purpose)values((p_media->>'id')::uuid,p_media->>'filename','image/webp',(p_media->>'width')::int,(p_media->>'height')::int,(p_media->>'bytes')::int,'news');
 insert into news_articles(title,slug,excerpt,body,cover_id,cover_alt,seo_title,seo_description,author_name,category,tags,status,publish_at)
 values(p_article->>'title',p_article->>'slug',p_article->>'excerpt',p_article->>'body',(p_media->>'id')::uuid,p_article->>'cover_alt',p_article->>'seo_title',p_article->>'seo_description','Ban biên tập RELOO',p_article->>'category',array(select jsonb_array_elements_text(p_article->'tags')),'PUBLISHED',now())returning id into published_id;
 -- Website publication only; do not broadcast up to forty unsolicited messages a day.
 delete from automation_jobs where kind='NOTIFY_BROADCAST' and payload->>'source'='NEWS' and payload->>'id'=published_id::text;
 update news_autopilot_candidates set status='PUBLISHED',article_id=published_id,updated_at=now() where id=p_candidate;
 insert into security_audit(action,details)values('NEWS_AUTO_PUBLISHED',jsonb_build_object('articleId',published_id,'candidateId',p_candidate,'sourceUrl',candidate.canonical_url,'sourceHash',p_source_hash,'runId',p_owner));
 return published_id;
end $$;
revoke all on function reloo_news_autopilot_lease(uuid),reloo_publish_automatic_news(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function reloo_news_autopilot_lease(uuid),reloo_publish_automatic_news(uuid,uuid,jsonb,jsonb,text) to service_role;
