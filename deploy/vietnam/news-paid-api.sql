alter table news_autopilot_settings add column if not exists paid_api_enabled boolean not null default false;
alter table news_autopilot_settings add column if not exists daily_api_call_limit integer not null default 0 check(daily_api_call_limit between 0 and 200);
alter table news_autopilot_settings add column if not exists paid_image_enabled boolean not null default false;
alter table news_autopilot_settings add column if not exists daily_budget_vnd integer check(daily_budget_vnd between 10000 and 5000000);
alter table integration_settings drop constraint if exists integration_settings_provider_check;
alter table integration_settings add constraint integration_settings_provider_check check(provider in('VNPT','SEPAY','EVM','TWENTY','GMAIL','VIBI_NEWS'));
create table if not exists news_autopilot_api_calls(
 id uuid primary key,run_id uuid not null,candidate_id uuid not null references news_autopilot_candidates(id),
 kind text not null check(kind in('TEXT','IMAGE')),model text not null,
 status text not null default 'RESERVED' check(status in('RESERVED','SUCCEEDED','UNCERTAIN')),
 usage jsonb not null default '{}',error_code text,created_at timestamptz not null default now(),finished_at timestamptz
);
create index if not exists news_api_calls_day on news_autopilot_api_calls(created_at);
alter table news_autopilot_api_calls enable row level security;
revoke all on news_autopilot_api_calls from public,anon,authenticated;
grant all on news_autopilot_api_calls to service_role;
create or replace function reloo_news_reserve_api_call(p_id uuid,p_run uuid,p_candidate uuid,p_kind text,p_model text)returns uuid language plpgsql security definer set search_path=public as $$
declare s news_autopilot_settings; used integer;start_day timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('reloo-news-api-budget',0));
 select * into s from news_autopilot_settings where id;
 if not s.paid_api_enabled or s.provider<>'VIBI' or s.daily_budget_vnd is null or s.daily_api_call_limit=0 then raise exception 'NEWS_PAID_NOT_ENABLED';end if;
 if not exists(select 1 from news_autopilot_lease where id and owner=p_run and expires_at>now())then raise exception 'NEWS_LEASE_EXPIRED';end if;
 if p_kind='IMAGE' and not s.paid_image_enabled then raise exception 'NEWS_PAID_IMAGE_DISABLED';end if;
 if not exists(select 1 from news_autopilot_candidates where id=p_candidate and status in('GENERATING','READY'))then raise exception 'NEWS_CANDIDATE_INVALID';end if;
 if p_kind='TEXT' and p_model<>'claude-sonnet-4-6' or p_kind='IMAGE' and p_model<>'gpt-image-2' then raise exception 'NEWS_MODEL_NOT_VERIFIED';end if;
 start_day=date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
 select count(*) into used from news_autopilot_api_calls where created_at>=start_day;
 if used>=s.daily_api_call_limit then raise exception 'NEWS_API_CALL_LIMIT';end if;
 insert into news_autopilot_api_calls(id,run_id,candidate_id,kind,model)values(p_id,p_run,p_candidate,p_kind,p_model);
 return p_id;
end$$;
revoke all on function reloo_news_reserve_api_call(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function reloo_news_reserve_api_call(uuid,uuid,uuid,text,text) to service_role;
