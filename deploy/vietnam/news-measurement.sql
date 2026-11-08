begin;
alter table public.journey_events add column if not exists event_id uuid;
alter table public.journey_events add column if not exists event_data jsonb not null default '{}';
create unique index if not exists journey_event_id on public.journey_events(event_id);
create table if not exists public.news_measurement_config(id boolean primary key default true check(id),started_at timestamptz not null default now());
insert into news_measurement_config(id) values(true) on conflict do nothing;
create table if not exists public.news_campaigns(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 3 and 100),source text not null default 'email' check(source in ('email','facebook','zalo','tiktok','google')),article_id uuid not null references news_articles(id) on delete cascade,created_by text references profiles(id),created_at timestamptz not null default now());
create table if not exists public.news_engagement_events(
 id uuid primary key,view_id uuid not null,article_id uuid not null references news_articles(id) on delete cascade,
 visitor_hash text not null,session_hash text not null,event text not null check(event in ('VIEW','ENGAGED_30S','SCROLL_50','SCROLL_90','CTA_CLICK','OUTBOUND_CLICK','RELATED_CLICK','SHARE_CLICK')),
 source text not null check(source in ('search','social','email','referral','internal','direct')),device text not null check(device in ('mobile','tablet','desktop')),language text not null check(language in ('vi','en','other')),
 slot text not null check(slot in ('body','sidebar','footer','related','toc','header','other')),target text not null check(target in ('product','explore','needs','listing','chat','news','external','other')),
 campaign_id uuid references news_campaigns(id) on delete set null,created_at timestamptz not null default now()
);
create unique index if not exists news_event_once on news_engagement_events(view_id,event) where event in ('VIEW','ENGAGED_30S','SCROLL_50','SCROLL_90');
create index if not exists news_event_date on news_engagement_events(created_at,article_id);
create index if not exists news_event_view on news_engagement_events(view_id);
create table if not exists public.news_quality_audits(article_id uuid primary key references news_articles(id) on delete cascade,article_version integer not null,score integer not null check(score between 0 and 100),result jsonb not null,checked_at timestamptz not null default now());
create table if not exists public.news_editorial_reviews(article_id uuid primary key references news_articles(id) on delete cascade,article_version integer not null,status text not null check(status in ('APPROVED','CHANGES_REQUIRED')),sources_checked boolean not null default false,note text not null check(length(note) between 10 and 2000),reviewed_by text not null references profiles(id),reviewed_at timestamptz not null default now());
alter table news_measurement_config enable row level security;alter table news_campaigns enable row level security;alter table news_engagement_events enable row level security;alter table news_quality_audits enable row level security;alter table news_editorial_reviews enable row level security;
revoke all on news_measurement_config,news_campaigns,news_engagement_events,news_quality_audits,news_editorial_reviews from public,anon,authenticated;
grant all on news_measurement_config,news_campaigns,news_engagement_events,news_quality_audits,news_editorial_reviews to service_role;
create or replace function public.reloo_record_news_event(p_data jsonb,p_visitor text,p_session text) returns void language plpgsql security definer set search_path=public as $$
declare article news_articles;campaign uuid;view uuid:=(p_data->>'viewId')::uuid;
begin
 select * into article from news_articles where id=(p_data->>'articleId')::uuid and status in ('PUBLISHED','SCHEDULED') and (publish_at is null or publish_at<=now());if not found then return;end if;
 perform pg_advisory_xact_lock(hashtextextended('news-view:'||view::text,0));
 if p_data->>'event'<>'VIEW' and not exists(select 1 from news_engagement_events where view_id=view and event='VIEW' and article_id=article.id and visitor_hash=p_visitor and session_hash=p_session) then return;end if;
 if (select count(*) from news_engagement_events where view_id=view)>=30 then return;end if;
 if p_data->>'campaign' is not null then select id into campaign from news_campaigns where id=(p_data->>'campaign')::uuid and article_id=article.id;end if;
 insert into news_engagement_events(id,view_id,article_id,visitor_hash,session_hash,event,source,device,language,slot,target,campaign_id)
 values((p_data->>'id')::uuid,view,article.id,p_visitor,p_session,p_data->>'event',p_data->>'source',p_data->>'device',p_data->>'language',p_data->>'slot',p_data->>'target',campaign) on conflict do nothing;
end $$;
create or replace function public.reloo_news_metrics(p_days integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare start_at timestamptz;previous_at timestamptz;result jsonb;
begin
 if p_days not in (7,30,90) then raise exception 'INVALID_PERIOD';end if;
 start_at:=((now() at time zone 'Asia/Ho_Chi_Minh')::date-(p_days-1))::timestamp at time zone 'Asia/Ho_Chi_Minh';previous_at:=start_at-make_interval(days=>p_days);
 with events as(select * from news_engagement_events where created_at>=previous_at),
 current_views as(select * from events where event='VIEW' and created_at>=start_at),
 per_view as(select v.*,exists(select 1 from events e where e.view_id=v.view_id and e.event='ENGAGED_30S') and exists(select 1 from events e where e.view_id=v.view_id and e.event='SCROLL_50') as engaged,exists(select 1 from events e where e.view_id=v.view_id and e.event='CTA_CLICK') as clicked from current_views v),
 totals as(select count(*) as views,count(distinct visitor_hash) as browsers,count(distinct session_hash) as sessions,count(*) filter(where engaged) as engaged_views,count(*) filter(where clicked) as cta_views from per_view),
 daily as(select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,count(*) as views,count(distinct visitor_hash) as browsers,count(*) filter(where engaged) as engaged_views from per_view group by 1),
 articles as(select article_id,count(*) as views,count(distinct visitor_hash) as browsers,count(*) filter(where engaged) as engaged_views,count(*) filter(where clicked) as cta_views from per_view group by article_id),
 sources as(select source,count(*) as views,count(distinct visitor_hash) as browsers,count(*) filter(where clicked) as cta_views from per_view group by source),
 devices as(select device,count(*) as views from per_view group by device),languages as(select language,count(*) as views from per_view group by language),
 campaigns as(select campaign_id,count(*) as views,count(distinct visitor_hash) as browsers,count(*) filter(where clicked) as cta_views from per_view where campaign_id is not null group by campaign_id),
 clicks as(select slot,target,count(*) as clicks from events where created_at>=start_at and event in ('CTA_CLICK','OUTBOUND_CLICK','RELATED_CLICK','SHARE_CLICK') group by slot,target)
 select jsonb_build_object('totals',(select to_jsonb(t) from totals t),'previous',jsonb_build_object('views',(select count(*) from events where event='VIEW' and created_at<start_at),'browsers',(select count(distinct visitor_hash) from events where event='VIEW' and created_at<start_at)),
 'daily',coalesce((select jsonb_agg(d order by day) from daily d),'[]'::jsonb),'articles',coalesce((select jsonb_agg(a order by views desc) from articles a),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(s order by views desc) from sources s),'[]'::jsonb),'devices',coalesce((select jsonb_agg(d) from devices d),'[]'::jsonb),'languages',coalesce((select jsonb_agg(l) from languages l),'[]'::jsonb),
 'campaigns',coalesce((select jsonb_agg(c) from campaigns c),'[]'::jsonb),'clicks',coalesce((select jsonb_agg(c order by clicks desc) from clicks c),'[]'::jsonb),'startedAt',(select started_at from news_measurement_config where id),'periodStart',start_at,'retentionDays',90,'comparisonComplete',p_days<90 and (select started_at<=previous_at from news_measurement_config where id)) into result;
 return result;
end $$;
create or replace function public.reloo_queue_news_quality() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and new.version=old.version then return new;end if;
 insert into automation_jobs(kind,payload) values('NEWS_QUALITY_AUDIT',jsonb_build_object('articleId',new.id));return new;
end $$;
drop trigger if exists news_quality_changed on news_articles;
create trigger news_quality_changed after insert or update on news_articles for each row execute function reloo_queue_news_quality();
-- Existing-article backfill is applied separately after the new worker is ready.
create or replace function public.reloo_site_metrics(p_days integer) returns jsonb language sql security definer set search_path=public as $$
 with events as(select id,visitor_hash,session_hash,event,event_data,created_at,
 case when path like '/news/chu-de/%' then '/news/chu-de/:topic' when path like '/news/%' then '/news/:article' when path like '/product/%' then '/product/:id' when path like '/user/%' then '/user/:id' when path like '/shorts/%' then '/shorts/:id' else path end as path
 from journey_events where created_at>=now()-make_interval(days=>least(30,greatest(1,p_days))) and (path in ('/','/noi-khu','/news','/explore','/needs','/pricing','/safety','/help','/lend','/shorts','/cashback') or path like '/news/%' or path like '/product/%' or path like '/user/%' or path like '/shorts/%')),
 views as(select * from events where event='PAGE_VIEW'),
 routes as(select path,count(*) as views from views group by path order by views desc limit 20),
 sources as(select coalesce(event_data->>'source','unknown') as source,count(*) as views from views group by 1),
 devices as(select coalesce(event_data->>'device','unknown') as device,count(*) as views from views group by 1),
 clicks as(select coalesce(event_data->>'target','other') as target,count(*) as clicks from events where event='NAV_CLICK' group by 1)
 select jsonb_build_object('days',least(30,greatest(1,p_days)),'views',(select count(*) from views),'browsers',(select count(distinct visitor_hash) from views),'sessions',(select count(distinct session_hash) from views),
 'routes',coalesce((select jsonb_agg(r) from routes r),'[]'::jsonb),'sources',coalesce((select jsonb_agg(s) from sources s),'[]'::jsonb),'devices',coalesce((select jsonb_agg(d) from devices d),'[]'::jsonb),'clicks',coalesce((select jsonb_agg(c) from clicks c),'[]'::jsonb));
$$;
create or replace function public.reloo_save_news_audit(p_article uuid,p_version integer,p_result jsonb) returns boolean language plpgsql security definer set search_path=public as $$
begin
 perform 1 from news_articles where id=p_article and version=p_version for share;if not found then return false;end if;
 insert into news_quality_audits(article_id,article_version,score,result) values(p_article,p_version,(p_result->>'score')::integer,p_result)
 on conflict(article_id) do update set article_version=excluded.article_version,score=excluded.score,result=excluded.result,checked_at=now();return true;
end $$;
create or replace function public.reloo_review_news_quality(p_actor text,p_article uuid,p_version integer,p_status text,p_note text,p_sources boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from news_articles where id=p_article and version=p_version for update;if not found then raise exception 'ARTICLE_CHANGED';end if;
 if p_status not in ('APPROVED','CHANGES_REQUIRED') or length(trim(p_note)) not between 10 and 2000 or p_status='APPROVED' and not p_sources then raise exception 'REVIEW_INVALID';end if;
 insert into news_editorial_reviews(article_id,article_version,status,sources_checked,note,reviewed_by) values(p_article,p_version,p_status,p_sources,p_note,p_actor)
 on conflict(article_id) do update set article_version=excluded.article_version,status=excluded.status,sources_checked=excluded.sources_checked,note=excluded.note,reviewed_by=excluded.reviewed_by,reviewed_at=now();
 insert into security_audit(actor_id,action,details) values(p_actor,'NEWS_QUALITY_REVIEWED',jsonb_build_object('articleId',p_article,'version',p_version,'status',p_status,'sourcesChecked',p_sources));
end $$;
revoke all on function reloo_record_news_event(jsonb,text,text),reloo_news_metrics(integer),reloo_site_metrics(integer),reloo_queue_news_quality(),reloo_save_news_audit(uuid,integer,jsonb),reloo_review_news_quality(text,uuid,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function reloo_record_news_event(jsonb,text,text),reloo_news_metrics(integer),reloo_site_metrics(integer),reloo_save_news_audit(uuid,integer,jsonb),reloo_review_news_quality(text,uuid,integer,text,text,boolean) to service_role;
commit;
