# News management — 16/10/2026

## Incident and fix

Live settings were enabled=true, provider=VIBI, paid_api_enabled=false, daily_api_call_limit=0, daily_budget_vnd=50000. Recent runs failed with NEWS_PAID_BUDGET_OR_PERMISSION_REQUIRED. No inference was attempted in these failed runs: the guard stopped before fetching/generating candidates.

The settings API now checks readiness before enabling; the worker reports BLOCKED without process failure if an invalid enabled configuration exists. The inconsistent enabled flag was paused and audited. Budget remains 50,000 VND/day. This does **not** enable paid inference, increase quota or bypass the need for a provider-enforced spend limit on a dedicated key. UI now shows the actual blocking reasons, not just ERROR or a misleading enabled badge.

## Interface

Separate Articles and Automation tabs. Articles: status-count shortcuts, all/unpublished/draft/scheduled/published/archived filter, category, accent-insensitive search, newest/oldest/title sort, clear filters, thumbnails, public vs draft links, preview/edit actions. Automation: readiness, counts/budget/provider cards, blocked guidance, queue status filter, Vietnamese statuses/reasons, expandable diagnostic codes, source freshness and run history. Views are responsive and do not expose integration secrets.

Draft and scheduled articles have an outside Publish now button for content.write users. Native confirmation dialog has browser focus trapping/Escape behavior. The endpoint re-reads the persisted article and validates required content, WebP cover, allowed source status and submitted version; a version-conditional UPDATE prevents overwriting or double publishing. Scheduled publication time is changed to now. Archived items require editor action instead. This button does not publish an unverified raw source from the automation queue.

## Validation

Readiness/filter unit tests and existing CRM/security tests pass. Browser fixture uses the real React components and intercepted API replies: combined filters work, publish sends id/version only once and refreshes status, blocked automation button is disabled, mobile views do not overflow. Fixtures do not publish real articles or create paid calls. Production build/anonymous API checks and a paused worker run verify deployment. The list still loads the latest 200 records; filters apply to that loaded set.
