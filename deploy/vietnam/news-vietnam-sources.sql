alter table news_autopilot_settings add column if not exists collection_enabled boolean not null default true;
alter table news_autopilot_sources add column if not exists source_kind text not null default 'RSS' check(source_kind in('RSS','HTML','SITEMAP'));
alter table news_autopilot_sources add column if not exists region text not null default 'GLOBAL';
alter table news_autopilot_sources add column if not exists link_pattern text;
alter table news_autopilot_sources add column if not exists date_selector text;
alter table news_autopilot_sources add column if not exists last_discovered_count integer not null default 0;
alter table news_autopilot_sources add column if not exists last_eligible_count integer not null default 0;
create table if not exists news_autopilot_documents(
 id uuid primary key default gen_random_uuid(),source_id text not null references news_autopilot_sources(id),canonical_url text not null unique,title text not null,
 source_published_at timestamptz,content_hash text not null,verified_at timestamptz not null default now(),reference_only boolean not null default true
);
alter table news_autopilot_documents enable row level security;
revoke all on news_autopilot_documents from public,anon,authenticated;
grant all on news_autopilot_documents to service_role;
update news_autopilot_sources set enabled=false where id in('apple-newsroom','samsung-global','google-pixel','fed-monetary','nasa-environment');
