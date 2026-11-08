-- Run only after the worker with NEWS_QUALITY_AUDIT support is healthy.
insert into public.automation_jobs(kind,payload)
select 'NEWS_QUALITY_AUDIT',jsonb_build_object('articleId',a.id)
from public.news_articles a
where not exists(select 1 from public.news_quality_audits q where q.article_id=a.id and q.article_version=a.version)
and not exists(select 1 from public.automation_jobs j where j.kind='NEWS_QUALITY_AUDIT' and j.status in ('QUEUED','RUNNING') and j.payload->>'articleId'=a.id::text);
