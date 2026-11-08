# RELOO Operations Center

Implemented 2026-10-17 in the existing Next.js CRM. Entry: **Vận hành → Trung tâm vận hành**, `/crm?view=control`.

## Design and source interpretation

Based on the user's WareTrack-style attachment: full-scene isometric landscape, floating HUD, selectable entities, camera controls, detail inspector, connections and live refresh. Adapted to RELOO green rather than copying WareTrack branding. The landscape is an accessible SVG/CSS **2.5D isometric illustration**, not a Three.js/WebGL simulation or physical digital twin. No extra package, AI image call, textures or raster downloads are required. Motion illustrates the architecture; it does not claim to measure live traffic. A list and mobile selection strip provide keyboard/touch alternatives to the map.

Facebook reel URL was attempted through the web tool (provider error), then fetched directly (HTTP 200, login content). The actual video was not independently viewed. The attached detailed brief is the visual reference.

## Sources and permissions

| World entity | Existing source | Required source permission | Interpretation |
|---|---|---|---|
| Website/API | api_traces | traffic.read | Latest 300 rows in last 24 hours; sample P95 and 5xx |
| Orchestrator | automation_jobs | jobs.read | Latest 300 rows in last 24 hours; queue states |
| AI newsroom | news_autopilot_runs / selected settings | content.read | Stored runs and configuration readiness; no paid provider probe |
| Rentals | transactions | orders.read | Latest 300 rows in last 24 hours |
| Calendar | rc_calendar_events | settings.read | Current stored sync-state sample, not personal calendar contents |
| Neighborhood | nk_places | neighborhood.read | Current stored location-state sample, not resident records |

The entry/API also require **control.read** in addition to existing authenticated CRM MFA receipt. Staff get no implicit source access from control.read. Admin/owner wildcard grants continue to work. A transaction viewer without reports.read is not given a link to the overview tool. No shell commands, Docker socket, tokens, document links, user IDs, emails, addresses, job payload/result or provider secrets are returned.

Counts are explicitly sampled, not complete totals or uptime percentages. At 300 rows the inspector warns of truncation. Old jobs beyond the 24-hour window are not included. Empty sources are distinct from unavailable sources; missing migrations and individual query failures do not hide the rest of the world. Source queries run concurrently with a 5-second timeout and abort signal. API responses are private/no-store and rate limited per authenticated profile. Client refresh is every 15 seconds in visible tabs, with manual refresh/pause and stale-data display; 401/403 clears the previous snapshot. Auth and permission checks run on every refresh.

## Worker heartbeat

`deploy/vietnam/control-center.sql` adds only `operations_heartbeats`, with backend-only privileges, RLS, fixed ID and a small module allowlist. The existing operations worker writes a pulse at most once every 30 seconds from its main loop. The row is overwritten rather than appended, so no personal history accumulates. It cannot reveal hostnames, process IDs or credentials. Fresh means a loop pulse within 90 seconds; stale means older; absent/error/implausible future timestamps mean unknown. This is not a guarantee that every module, payment provider, AI model, host or Cloudflare Tunnel is healthy. Multiple operations worker instances share one aggregate pulse, not per-instance liveness.

## Extension contract

Add explicit reviewed sources to `CONTROL_SOURCES`, connections to `CONTROL_LINKS`, labels to `control-content.js`, an icon and scene position to `ControlCenter.jsx`, and permission tests. Data changes and existing new records appear automatically on refresh. **New code modules are not automatically granted access or introspected**, to prevent exposing arbitrary tables or secrets. New infrastructure metrics (CPU/RAM, tunnel, backups, per-agent heartbeat, token/cost details) need actual restricted collectors before they can be shown truthfully.

## Run, test and rollout

1. Run the existing app with `npm run dev`. `/crm/control-preview` is a development-only visual fixture, clearly labeled simulated data. Production returns notFound; it is not an authentication bypass. `?lang=en-US` switches preview language. `?live=1` is for browser transport interception tests and still uses the real protected endpoint.
2. `node --test tests/control-center.test.mjs tests/control-heartbeat.test.mjs tests/security-hardening.test.mjs`.
3. ESLint the new modules and changed CRM integration; `npm run build`.
4. In an approved staging environment, back up DB, apply `deploy/vietnam/control-center.sql`, then `deploy/vietnam/security-lockdown.sql`. No existing data is rewritten. Restart the existing operations worker as part of approved rollout, grant staff control.read plus needed source permissions, verify pulse and source readings using real CRM MFA accounts.
5. Check expired session, revoked permissions, missing source tables, pause/resume, mobile, reduced motion, English, slow API and 300-row warnings.
6. Rollback: revert this feature's code/menu/worker pulse call and revoke control.read grants. Leave the additive heartbeat table in place; no destructive rollback is required. Existing marketplace/queues keep working if the telemetry write fails.

No production deployment/migration, live user notification, paid API call or AI image generation was performed for this feature. Real production source availability and authenticated end-to-end CRM access remain staging verification items.

## Actual verification

- 11 tests: projection, source permissions, isolated failures/timeouts, sample caps, configuration readiness, percentile calculation, read-only grants, i18n, heartbeat freshness, and real SQL migration/upsert/grants in embedded PGlite. PGlite is not a production PostgreSQL integration test.
- Existing 4 security-hardening tests passed, including backend-only database lockdown.
- Existing 7 CRM security/navigation/freshness regression tests passed.
- 10 browser checks passed using local Next.js: scene/list selection, search empty state, camera controls, mobile overflow/selection, reduced motion, English; refresh, stale recovery and permission revocation use explicitly intercepted/mock HTTP data.
- Desktop/mobile screenshots directly inspected in `output/control-center/`. Root auth session requests in the isolated local harness returned 503 because real Supabase Auth is intentionally not configured there; this is not a successful real CRM login test.
- Final production build and scoped ESLint passed.

No performance benchmark or 60 FPS claim was made. Hardware FPS, native app behavior, real AI provider liveness and server/tunnel recovery were not tested by this page.
