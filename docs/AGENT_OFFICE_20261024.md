# RELOO Agent Office — implementation record

## Change assessment

Affected modules: management UI, CRM sign-in capability display, private agent-office adapter and deployment. Rules: 005–010, 013–020; existing staff authorization, MFA and host-only HttpOnly cookies remain mandatory. No customer fields, marketing provider or financial authority added. Agent names, project labels, run status and timestamps are internal operational metadata; access is restricted to CRM administrators initially. Upstream remains responsible for its SQLite retention; no customer chats or production database are imported.

## Verified source

Cloned the user-supplied repository into `../.tooling/agent-office`, pinned to `8a2e19fde3a50295f0da2344f791918e85c62e1f`. Source inspection confirms Go 1.27.3, SQLite, Nuxt dashboard, authenticated jobs/projects/agents APIs, schedules, worktrees, approval cards, MCP gateway and Ollama OpenAI-compatible provider preset. MIT copyright notice must accompany redistribution. README feature claims are not runtime test results. No upstream default account may be published.

The RELOO office scene is original CSS/SVG, with no upstream commercial screenshots or character assets. Movement visualizes observed running jobs; it does not represent an extra agent or prove collaboration. Empty/disconnected states must remain explicit. No hidden model reasoning is collected. Existing authority decision stands: AI prepares transactions; customers confirm each transaction.

## Authentication finding

Staging's GoTrue explicitly disables Google, while the CRM login previously rendered its Google button unconditionally. Capability-aware rendering fixes that misleading entry point. This alone does not federate identities: the existing ticket bridge is intentionally bound to one backend and requires a real CRM MFA receipt. Sharing production identity across UAT requires a deployed central broker and explicit environment-local permissions; pointing UAT at production data or sharing parent-domain refresh cookies is not an acceptable shortcut.

## Acceptance status

In progress. Implemented original responsive office scene, job list/detail, connections view, fixed-endpoint metadata adapter, admin/MFA API and allowlisted Agent Office SSO target. Added a forward migration extending the ticket destination constraint. Existing production identity and customer data have not been copied to UAT.

Browser fixture checks at 1440, 820 and 390 px: no horizontal overflow; office/tasks/connections navigation works; nested links discovered and fixed. Screenshots are under `output/playwright/agent-office-*-fixture.png`. These use explicit QA records, not live workers. Adapter/host tests cover rejected endpoints, filtered metadata, private REST cookies, authentication failure/expiry and bounded responses; existing SSO tests execute the SQL and forward destination migration. Upstream build initially failed: CRLF frontmatter, missing git and root-only filesystem semantics in tests. Compatibility changes retain all upstream tests; the final build outcome is separate evidence.

Live capability probes: production CRM returns Google=true; chat and staging return Google=false. The CRM sign-in button now follows backend capabilities, rather than offering a disabled provider. This fixes misleading UI only; cross-environment identity federation remains an explicit pending integration.

Private upstream installation now runs on the server: all 49 upstream test packages and vet passed after adding git/bash/procps, normalizing LF and running tests as a non-root user. Static binary SHA256 `3a7b7928ea5ed5f1a3280c18c2f673ce4e41e9cc316259d5923522d09404e085`. Resource-limited backend uses read-only root, dropped capabilities, a dedicated data directory and no production mounts. The default account was replaced; the metadata reader is a separate member account.

Actual REST integration rejected the upstream MCP personal token. Corrected the adapter to hold a private member cookie server-side; revoked the unused MCP token. Runtime test from the RELOO app container reads one project and one actual `done` job through the current adapter. Qwen `qwen2.5:1.5b` local provider test passed. A real no-tool/no-shell connectivity job completed in 70,897 ms, using 2,048 input and 5 output tokens. This proves local execution, not suitability for complex coding, low latency, multi-agent collaboration or autonomous production operations. Proofs are in `output/agent-office/{build-proof,runtime-proof,job-proof,adapter-proof}.json`.

Added source implementation for central CRM federation: one-time proof-key codes, independent host credentials, opaque references, explicit local mapping and repeated central MFA/local role checks. See CENTRAL_IDENTITY_20261024.md. Activation and live cross-host Google/TOTP acceptance remain NOT_TESTED. Added arrival/working motion with reduced-motion support and a coordination view based solely on actual parent/child jobs; no invented conversations or hidden model reasoning.

Source-level govulncheck v1.9.0 returned exit0; the binary's module warning concerns unused OpenPGP packages, whereas the source imports Argon2. Preserve both reports. The unused upstream Nuxt dashboard initially had28 dependency advisories (4 CRITICAL/8 HIGH); an allowed-range lockfile update reduces this to one HIGH node-forge and one LOW esbuild. No forced major upgrade or advisory suppression was applied. Nuxt remains uninstalled/unpublished and is not part of the RELOO React runtime. It must not be activated while its unresolved dependency risk remains.

Public `agent.reloo.vn`, live CRM/MFA handoff, write-management UI, inter-agent transcript views and unattended workflows remain unimplemented or NOT_TESTED. Existing source-bound production gate remains NEEDS_REVIEW. No public host was published and no production service changed. This document is not a deployment or legal approval.

Private operational automation now runs deterministic checks of the two fixed first-party health endpoints through the restricted relay every5minutes, bounded to the UAT review window. Both endpoint checks and route/method denial tests passed; an actual script job completed. This tests HTTP availability only, not all product workflows. No arbitrary model command, automatic production modification, external message or paid-model call is enabled. General autonomous workflows still require individual tool/role review.
