# News quality and communications measurement

CRM → News → Quality & performance. Reports require `reports.read`; website-wide totals additionally require `traffic.read`; auditing, review and campaign creation require `content.write`. Production remains backend-only with nonce CSP and HttpOnly Auth cookies.

## What is measured

Only browsers with a current analytics-consent cookie participate; DNT/GPC opt-outs are respected. Consent revocation deletes both site and news browser/session IDs and removes event listeners. The public-page tracker records allowlisted route groups and link/button destination classes, never link text, query strings, form values, cursor coordinates, email addresses, precise location or private-page activity. No account/profile IDs are attached. Browser/session random IDs are HMACed server-side. Sessions use a 30-minute inactivity boundary; browser counts are not person counts or cross-device audience estimates.

News events: page view, 30 seconds of focused visible reading, 50/90% content scroll and classified CTA/outbound/related clicks. A qualified engaged view has both 30 seconds and 50% scroll. CTA rate counts views with at least one CTA click divided by views, not all clicks divided by views. It is not an order/revenue conversion rate. Preview articles and CRM are excluded. Events require a published article, consent, valid origin and valid enums. Views/progress are deduplicated; click retries use unique event IDs. Events without their matching view are ignored. There is a 30-event cap per news view and endpoint rate limits. Bots can still consent or forge client events, so these are observed browser signals, not certified human reach.

News events retain 90 days, existing website journey events retain 30 days. Reports support 7/30/90 days; website totals use at most 30 days and say so. Previous-period comparisons are disabled until enough tracking history exists, and disabled for 90-day reports because the previous 90-day window is outside retention. Days use Asia/Ho_Chi_Minh. Website and news figures overlap and must not be summed. Historical website data without new metadata is marked unknown, not inferred.

Campaigns use generated UUID codes verified against article IDs, not arbitrary incoming campaign names. Links optionally include an allowlisted source. New campaign attribution only exists when a browser visits such a link with analytics consent; it is not social-platform impression/reach data. At most the 100 newest campaigns are listed, and article quality is paginated in groups of 25.

## Editorial workflow

An insert or version change on `news_articles` queues `NEWS_QUALITY_AUDIT` for the existing worker. Existing articles are backfilled. The deterministic internal score checks title/description presentation, slug, useful body length, heading levels, cover/alt, internal/source links, author and excerpt. Length ranges are editorial suggestions, not Google ranking requirements. A link to a source is not proof that a claim is correct. No AI detection, fact approval, SERP ranking or traffic guarantee is claimed.

Editors may rerun checks and save APPROVED / CHANGES_REQUIRED with notes and a source-check acknowledgement. Review is transactional, permission checked, audited and tied to the exact article version. Changes invalidate the displayed approval. This release does not silently rewrite articles or block existing publication flows. SEO checks are on stored content, not an external backlink/site crawler.

## External limitations

Search Console, GA4, advertising platforms and social reach APIs are not connected by this release. Search impressions, query rankings, advertising spend, age/gender, offsite reach and revenue attribution are shown as unavailable, not zero or fabricated. No paid AI calls are made by these audits or event collection.

Deploy `deploy/vietnam/news-measurement.sql` after a database backup, apply `security-lockdown.sql`, reload PostgREST and rebuild app plus operations worker. Monitor job kind NEWS_QUALITY_AUDIT and audit article-version mismatch. Before enabling on production, test consent/opt-out, data minimization, event deduplication, exact aggregation and optimistic review locking. Browser checks should use mock metrics and events; do not seed fake production traffic for screenshots.
