# RELOO Chat Control — 24/10/2026

## Before change / scope

Owner requests chat.reloo.vn as the operational control plane for the shared website/app advisor. Reuse Next16.4.2, existing support conversations/messages, CRM staff permissions, TOTP/AAL2 receipts, server-only Supabase and configured first-party model. Read RELEASE_CHECKLIST/registry and local Next route/CSS guides before changes. Rules005–010,012–020 and all domain controls apply. New fields: staff operational configuration, approved FAQ content/source attribution, assignment/priority, redacted AI activity metadata and version audit. No new analytics SDK, tracking/IP identity, payment authority, provider secret field, background GPS or public-schema client grants.

## Reference

Dochat authenticated read-only revisit covered Chatbots, Conversations, Knowledge, Playground and Settings. A: labels expose bot configuration, interaction thresholds, conversation filters, knowledge sources, live preview and workspace settings. No save, bot toggle, lead contact, customer transcript extraction, subscription or message performed. Evidence under ignored output/rea/chat-control; previous public REA IDs and first10-section study in DOCHAT_AI_ADVISOR_20261024.md remain supporting evidence. Personal bot/workspace/account names are redacted. Public REA follow-up uses an isolated temporary profile, no login. These are UI observations, not access to Dochat training, matching or private backend.

## Product / navigation

Own RELOO green design: overview → unified conversation inbox → context & activity timeline → knowledge → bot configuration/version history → isolated preview → audit. Responsive split inbox on desktop; accessible list/detail views on mobile. Show actual source coverage and bounded report windows, not fictional completeness or legal-compliance percentages. Incoming bot/first-party automation events are centralized; customer-to-customer private messages are not copied into a blanket staff feed. Existing case permissions remain the boundary.

Only staff with CRM access + verified MFA can open operational APIs. support.read: redacted inbox/events; support.write: reply/takeover/resume/priority; support.assign: assign enabled support staff; support.contacts: reveal consented lead contact separately. bots.read: config/knowledge/audit; bots.write: draft/edit/preview; bots.publish: explicitly publish or roll back a reviewed version. No implicit new rights for an existing ordinary staff grant. Owner/admin roles retain existing wildcard behavior. No client receives service keys, refresh/access tokens or arbitrary secret configuration.

## Runtime authority

Published configuration is the single active version, loaded by the shared support API and safe public widget config endpoint. Drafts never affect users. Version publication and rollback are atomic compare-and-swap, idempotent and audited with actor/reason; stale edits conflict. Operational publication is not legal approval. Server-enforced price, availability, identity, cancellation/refund and transaction rules cannot be overwritten by a prompt. No new autonomous order/payment/refund/message-to-partner action is granted. Model endpoint/model allowlist stays server-configured; staff cannot insert a URL or secret.

Config controls bounded greeting/subtitle/quick prompts, automation/model toggle, allowed service modules, handoff behavior, and opt-in invitation thresholds. Optional interaction still requires existing analytics + marketing + explicit tab opt-in, honors GPC/DNT and frequency caps; settings cannot override refusal. Knowledge is reviewed structured FAQ text with public source links/rights attestation; no automatic third-party crawl or arbitrary URL fetch. Financial/legal/identity/availability claims require separate review and cannot be published as general FAQ overrides. Preview is read-only and separate from real customer threads/leads, clearly labelled; previews produce audit records, not fake customer conversations.

## Data / evidence

Trace observable results only: validated context path/module, selected public product IDs/reference amounts, intent, config version, model identifier, elapsed time, fallback/error code and rendered suggestion/action requirement. No hidden chain-of-thought, raw authentication headers, provider secrets, IP fingerprints or unrestricted model output. Transcripts keep existing actor-bound ownership and7day guest/30day account expiry; linked events cascade. Other operational activity30days; config versions/audit180days as an internal proposed operational retention, pending owner/legal approval. No claim that all historical AI activity can be reconstructed; new instrumentation records only events after deployment. No data used for model training. Rights/deletion distinguishes existing binding transaction records from this operational metadata.

## Hosting / release

chat.reloo.vn initially runs as **restricted internal UAT** against the dedicated staging backend, not production customer data. Same immutable app build as staging; Basic gate + noindex + host-only auth cookies + CRM MFA. DNS route creation is authorized by the requested domain; do not point this hostname at a production backend or relax production Guardian. User's existing temporary UAT deferral extends only to this explicitly requested protected management hostname, same31Oct2026 expiry; technical checks and confirmed critical/high blockers remain mandatory. Production/customer rollout remains blocked pending formal approvals.

Public paths on this hostname are restricted to the control/login/auth/assets needed; marketplace/business pages do not become an accidental second site. Origins are explicitly bound to configured management host, not wildcard reloo.vn. Staging Basic and Bearer authentication remain separate protocols; MFA enrollment must accept the staging Basic transport while rejecting token-only enrollment. Preserve nonce CSP, HttpOnly cookies, Tailscale management and production backup timers.

## Verification plan

Execute actual SQL fixtures for publication conflict/idempotency, staff permissions, assignment, expiry, revocation/retention and client grant denial. Browser fixture covers desktop/mobile, keyboard, draft persistence, preview, failure and disabled actions. Live UAT requires real synthetic staff login + TOTP, denied ordinary users/read-only writers, publish→widget effect, human takeover/no auto reply, central events, rollback and same build/catalog on both hosts. Privileged access must not use a fake receipt or bypass MFA. Record unavailable checks NOT_TESTED. Keep credentials and TOTP enrollment material only in ignored ACL/root-only files, never public reports or repository.

## Executed development evidence

Public REA evidence: ev_dff80ec599ccc73a502e6db61e214d98f9bfb310630aee7f59785441f2765dcb (`output/rea/chat-control/public-evidence.json`). Authenticated read-only notes remain separate and redacted. No third-party save or message was performed.

`node --test tests/chat-control.test.mjs tests/contextual-support.test.mjs`: 7 tests passed, including actual PGlite execution of support/control migrations. Browser fixture `scripts/chat-control-browser-check.js`: 12 assertions passed across 320/390/768/1440px, draft save, separate preview, explicit publication review, Escape and keyboard focus. Screenshots viewed under `output/playwright/chat-control-20261024/`. This is synthetic transport evidence, not real MFA, live publication or complete accessibility certification. Subsequent source-bound checks and deployed verification must be retained in output before reporting a release.

## Operating procedure

Live UAT found a tiny-model failure: generic JSON mode invented a product ID not present in the provided catalog. The server rejected it and safely fell back. A follow-up adds constrained JSON-schema decoding with an explicit ID enum (zero selections for an empty catalog), while preserving independent server validation. Direct synthetic requests against the configured first-party model verified schema support. Full technical checks and runtime verification must be rerun for this correction.

Staff need `crm.read` plus the relevant explicit rights. Open `/chat-control/login`, sign in and enroll a personal authenticator; never share the QR/seed. Create a draft, add only authorized public FAQ text (up to40 entries, 1200 characters per answer), verify both languages and preview. Save creates an immutable version. A separate `bots.publish` grant is required to activate it with a reason and review acknowledgment. Selecting an older published version and activating it performs an audited rollback. Version conflicts require reloading current state, never force-overwriting. Optional invitations still obey customer consent/GPC/DNT.

Conversation staff can take over, reply, resume automation or close an assigned thread. Contact reveal requires a separate right and records an audit event. AI activity shows observable decisions and reference data, not hidden reasoning. Source coverage explicitly distinguishes instrumented sources, private messages and future modules. No bulk customer export, arbitrary crawler, model-provider URL editor, order/payment/refund action or blanket access to private peer messages is added.
