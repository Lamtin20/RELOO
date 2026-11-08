# RELOO My Office integration

Owner request: adapt https://github.com/khanh020905/my-office for the existing agent operations interface. Pinned source1df03ee00ff94fdb7d8f81fe1f55c39bd671e6f3, upstream package0.5.0, MIT copyright2026 khanh020905. Full upstream checkout is retained under ignored `output/my-office-upstream`; dependency/runtime versions are not silently upgraded to upstream Next16.4.3.

Scope: selectively integrate the upstream procedural chibi rig and its pinned Three0.160.0 renderer dependency into RELOO's authenticated read-only Agent Office. Use existing `readOffice` allowlisted metadata adapter and CRM full-role/MFA API; do not import the upstream local-process server, install hooks, approval automation, plan telemetry, process cleanup, macOS startup service, filesystem access, arbitrary shells, PIN/LAN auth or demo sessions. This is integration of reusable open-source modules, not installation of the upstream full desktop management daemon. Preserve the earlier private tung1998/agent-office backend; it remains a separate job-data source.

Data/purpose/providers: existing bounded job/project/provider operational metadata only; visualize recent tasks, filter and select an agent, inspect supplied state. No new customer fields, hidden reasoning, prompts, output, local paths, credentials, external AI destination or paid service. Actor positions/room/person animation are decorative, not observed GPS/process activity. Only recorded running state animates working; no walk/read/command/deploy activity is fabricated from generic job status. Cap3D actors, lazy loading, reduced motion, visibility suspension, cleanup and accessible task-list fallback. No new raster source asset; all graphics are procedural geometry/canvas. MIT notices travel with adapted code/distribution. Existing image WebP rule remains intact.

Affected RULE-006/010/014/015/016/017/020; existing CRM authorization, server-only upstream session, origin/role boundaries and no public schema grants remain. No schema migration, business policy, World/UE5, production deployment, global Claude/Codex settings or default credentials changed. Review required before any staging/production rollout. Existing UAT authorization does not grant production management publication or connect synthetic staging to production job data.

Acceptance: actual upstream rig/code attribution and checksum inventory; no backend hook side effects; app API still denies unauthenticated/non-full-role callers; no fabricated live workers; correct normalized state/identity grouping; responsive3D with keyboard list equivalence, pause/resume, no-WebGL fallback, context loss/dispose; tests/lint/typecheck/scan and bounded desktop/mobile browser evidence. Full backend connection/device performance and release acceptance remain separately verified.

## Implemented interface

Existing `/agent-office` now offers a RELOO green office/list switch, procedural room and upstream chibi characters, orbit/zoom/reset camera and animation pause. Recent jobs are grouped by actual agent ID; a running job takes priority over completed history. No source connection means no invented workers. The renderer caps actors at 12 while retaining the full bounded list. Task filters combine text, project and normalized status; details and recorded parent/child relationships remain available through keyboard-accessible controls. Connection information distinguishes the visualization's upstream source from the existing private job backend.

Three.js is pinned to upstream's `0.160.0`; rendering is lazy, pixel ratio capped at 1.5, animation capped at 24 FPS and suspended for reduced motion, hidden/offscreen views or manual pause. Canvas resources are disposed when leaving 3D. These are implementation bounds, not measured frame-rate guarantees.

## Verification — 2026-11-08

| Check | Verified outcome |
| --- | --- |
| `node --test tests/my-office.test.mjs tests/agent-office.test.mjs` | 8/8 pass; grouping, filters, pinned bytes/license, metadata privacy, allowlisted endpoint and server-only session |
| `npm run test:all` | 532/532 pass |
| `npm run test:compliance` | 12/12 pass |
| `node --test tests/security-hardening.test.mjs` | 4/4 pass |
| `npx eslint` | Exit 0; 60 existing warnings across repository; focused changed application modules have no warnings/errors |
| `npx tsc --noEmit` | Exit 0 |
| `npm run build` | Exit 0; optimized Next.js webpack build |
| `npm audit --omit=dev --json` | No reported production dependency vulnerabilities at execution time |
| `npm run compliance:scan` | Completed; overall `NEEDS_REVIEW`, not release approval |

Playwright Chromium evidence is in ignored `output/playwright/my-office/`: desktop 1440×1000 and mobile 390×844 screenshots, interaction results, forced no-WebGL fallback and actual context-loss results. Verified: real Three canvas; no horizontal overflow; task filtering; parent-linked job list; modal Escape; canvas disposal on list switch; disconnected state removes actors; 401 clears old job data; fallback list/details remain usable; MIT notice HTTP 200. The real local CRM API rejected an unauthenticated request with HTTP 401. Connected UI browser tests deliberately intercept the API with clearly named synthetic QA fixtures; they do **not** prove production connectivity, model execution or authorization of a live account. The initial cold development navigation exceeded 30 seconds while compiling; subsequent navigation/render succeeded. Development compilation is not a production performance measurement. Isolated local bootstrap returned 503 because no business database was connected; no customer database was used.

Logs: `output/my-office-{tests,regression,compliance-tests,security,lint-all,typecheck,build,compliance-scan}.log` and `output/my-office-dependency-audit.json`. Browser fixtures/scripts are retained beside their screenshots for repeatable checks. No actual native Android/iOS hardware test, full accessibility certification, GPU/FPS/memory benchmark, live reader/MFA journey, live upstream connection or staging/production rollout was performed: **NOT_TESTED**. Existing release/legal/provenance review requirements remain open; upstream MIT provenance is documented, not an invented reviewer sign-off.

## Rollout and rollback

This change is installed in the working source only. Before publication, verify a real authorized CRM administrator/MFA journey against the approved private reader, current source-bound compliance/release evidence, and synchronized website/app shared runtime. Keep job credentials server-side and do not bridge isolated synthetic UAT into production management. No database migration is required. Release rollback is restoration of the previous application image across all web renderers; the private job backend and data remain unchanged. A visual rollback alone does not stop agent processes or alter their jobs.
