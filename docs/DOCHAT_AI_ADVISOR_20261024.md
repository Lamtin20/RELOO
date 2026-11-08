# Dochat.vn reference and RELOO contextual advisor — 24 October 2026

This reference is **dochat.vn**, not the unrelated dochat.com.vn marketplace previously reviewed in this repository. No third-party implementation, logo, commercial image or embed script is imported into the RELOO product.

## Evidence and scope

A = directly observed; B = public documentation claim; C = inference requiring verification; D = RELOO implementation decision. REA public-page evidence: ev_9f3fbb26f3b4d5b1858cd40e343dcff9026ab4f9fe7e63596a587cddc0fa0a7c. REA mobile widget-open evidence: ev_1dc0ac86e135b234bc97defe2349e5604b9e749b80c24d938f159e0581c8c0e6. The widget iframe was not expanded in that REA accessibility tree; Playwright follows up. Network observation ended with some requests unfinished and does not establish backend algorithms. No source maps/private server code are accessed.

The owner logged into the dedicated Chrome session. Read-only visits covered Chatbots, knowledge, products, visitors, leads, conversations, playground, settings and usage. No bot toggled, customer messaged, upload, subscription, form save or integration activation performed. A first navigation capture was stale because SPA navigation had not settled; it is superseded by the capture that waits for the actual URL and page heading. Personal account fields are redacted in retained textual summaries.

Sources checked: [Home](https://dochat.vn/), [Documentation](https://dochat.vn/tai-lieu), authenticated dashboard routes observed in output/rea/dochat-admin-study.txt. Screens/evidence under ignored output/rea; do not publish account captures or customer records.

Additional form previews were observed without submission: knowledge accepts text/website/file sources; products expose display/numeric price, currency, URL, SKU and attribute fields; widget settings expose new/returning greetings, two reminder stages, optional AI personalization, colors/placement/size, quick questions and configurable contact fields. These settings and labels are evidence of UI capability, not proof of crawler/vector indexing, ranking quality or delivery guarantees. No Dochat subscription limits or billing model are transplanted into RELOO.

## Observation → application

|Class|Observed/reference behavior|RELOO application|
|---|---|---|
|A/B|Floating launcher, embedded chat, quick questions, separate widget configuration|First-party accessible dialog; quick prompts, safe-area and keyboard support|
|A|Chat Only, Tracking Only and combined modes in the workspace|Chat works without optional tracking; no Dochat scripts installed|
|A/B|Knowledge sources, product management and human takeover|Reuse support API, public catalog, bot configuration, CRM support permissions and shared encryption|
|A|Contact-based leads and conversation filters|Optional contact form; consent separate from browsing; staff queue and manual reply|
|A|Advanced engagement threshold controls|Independent, explicit RELOO eligibility function; no hidden identification model|
|B|Public page describes behavior-based AI analysis as planned/unavailable|Do not describe that roadmap as a proven live algorithm|
|A/B|Visitor/IP and traffic-quality review screens|Not copied into the advisor. No IP fingerprint, cross-site identity or automatic fraud ban|
|D|Grounded advice with current product/rule data|Server reads public projection and authoritative rates; excludes other users' private fields|

Advanced values observed in this workspace, **not proven global defaults or execution outcomes**: wait 15 seconds; invitation expiry 120 seconds; one invitation/session; 30-minute interval; 24-hour cooldown after rejection; price 2 views/30 seconds; 2 product pages/45 seconds; high-intent controls 3 pages/90 seconds; 24-hour conversion window; 30-minute Sales-email freshness. The master automatic-interaction and Sales switches were off in the observed workspace. No changes were saved. RELOO adopts only bounded, opt-in, tab-memory price/product invitations; it does not implement Dochat's commercial billing, cross-site network identity or email Sales automation.

## RELOO flow and rules

Open advisor → ask/quick prompt → server validates context and reads public listing → optional configured first-party AI selects a validated intent/product subset → grounded answer and product links → optional contact/consent → CRM queue → staff takeover/reply → optional resume automation. No booking, hold, payment, refund approval or seller message is created by an answer.

The existing support widget was unmounted and required login. It is now mounted on customer-facing routes and accepts anonymous sessions through an HttpOnly, SameSite cookie. No chat cookie or history request is made until interaction. The client supplies only a whitelisted pathname; query strings, arbitrary URLs and private owner details are excluded. Conversation access is bound to account or HMAC guest session, never conversation UUID alone. A new account does not silently inherit an anonymous transcript.

The model is an adapter to the existing RELOO_AI_URL/model, requiring an APPROVED support-bot configuration. It classifies/selects bounded public facts; unvalidated free-text model output is never sent to customers. Invalid output, timeout or unavailable model falls back to deterministic guidance and is labelled automatic, not AI-generated prose. Sensitive patterns are redacted before model input and persisted user transcript. No claim that arbitrary secrets can be detected perfectly. Model requests are capped, timed out and read-only. Generation/model hosting is NOT_TESTED until an actual configured provider is exercised.

UAT provider checkpoint: a separate ollama/ollama:0.11.4 instance was started on the internal staging network with a 2GB memory/2-CPU cap. Only the existing cached qwen2.5:1.5b model weights were copied; production keys, config, conversations and networks were not reused. A synthetic classification request returned HTTP200, valid JSON, intent rent and an allowlisted demo product in 5010ms. This verifies that one local model request, not a broad accuracy benchmark or production approval. The app-to-model integration must still be exercised on the deployed app. A scoped UAT bot configuration enables classification only; it is not a legal approval.

An opaque, actor-bound conversation reference is held in tab sessionStorage for at most 24 hours to survive reload; it carries no token, contact information or transcript. The server still rechecks ownership and expiry. Polling responses cannot overwrite a newer submitted turn. New submitted contacts update the active advisor lead rather than creating duplicates; consent withdrawal does not override a staff takeover.

Catalog selection is bounded to 30 recent public candidates (or the exact current listing), ranked by relevant terms before the model receives up to eight public product fact records and the last eight redacted conversation messages. The model may select at most three allowlisted IDs. Explicit rule intent/current-page context takes precedence; the model can classify otherwise unknown wording. This is an independent, inspectable RELOO retrieval/routing design, not a claim of reproducing Dochat's private embedding, ranking or training algorithms. An unknown product need produces no unrelated catalog claim; users can continue via the existing search flow.

Engagement requires **three separate conditions**: existing analytics consent, existing marketing consent and a new unchecked, tab-only invitation permission. GPC, hidden tabs, refusal, expiry and frequency suppress invitations. Only local tab counters are used; no behavioral beacon, unique visitor fingerprint, raw IP or browsing history is sent. Reload resets tab-memory counters; 24-hour rejection cooldown is only effective while that instance is alive. It is not advertised as durable cross-device recognition.

Contact collection: optional name, email or phone (one required), explicit purpose/version/time. Contact is encrypted with the existing private-data key; CRM support.read is required to decrypt. Withdrawal removes contact from the advisor request and cancels it. This is not marketing consent. Guest conversations expire after 7 days; account advisor conversations after 30; advisor contact requests after 30. The purge RPC is attached to the existing operations worker; a scheduled purge must also be configured where that worker is disabled. Backup expiry is a separate operational control, not a promise of instant removal from every backup.

Anonymous self-service withdrawal requires the original valid chat session (guest cookie 24h). After that session is lost/expired, a staff-assisted request needs contact verification; this is an outstanding production legal/operations review item. Minimal contact requests remain available to authorized staff for their 30-day period even after an expired guest transcript is purged. No claim of permanent anonymous identity recovery is made.

POST retries use an idempotency key and content hash; DB commits messages/request/contact atomically. Concurrent first-contact submissions may leave an empty orphan conversation and return a conflict, but cannot duplicate a persisted turn/lead. Staff takeover pauses automatic replies. Staff replies require support.write; manual resume is explicit. Partner roles without CRM permission cannot inspect contacts/conversations.

Human takeover does not disable the customer's composer. Further customer messages are stored as USER-only turns while WAITING/HUMAN, without a model call or synthetic assistant answer. A race in which staff takes over during an in-flight automatic answer is rejected at commit; the automatic response cannot overwrite a human takeover. Closed conversations reject new turns; an explicit new-conversation control preserves the draft and starts a new thread.

## Schema, operation and verification

Migration: supabase/migrations/20261024100000_contextual_support.sql, then deploy/vietnam/security-lockdown.sql. Back up the target first. Existing support rows remain available; new expiry applies to new advisor conversations. Public-schema/RPC access remains backend-only. No binding legal policy or approval is auto-published. New field purposes remain review candidates.

Run node --test tests/contextual-support.test.mjs, relevant security/consent/regression checks, npm run compliance:scan and npm run test:compliance. Browser fixture: scripts/advisor-browser-check.js. Evidence output/advisor-*.log and output/playwright/advisor-20261024. Claims of PASS must come from these executed logs. AI live model, real staff CRM access, full backup erasure and native-device acceptance are separate evidence, not implied by browser fixtures.

Production publishing remains gated. The existing restricted staging exception may be used only for isolated UAT with current technical evidence; it does not approve contact processing for production or declare legal compliance.

CRM authentication now ignores the staging Basic-access header when looking for a Bearer credential and falls back to the existing protected auth cookie. MFA receipt, verified JWT claims, staff permissions and session revocation checks remain required. This fixes the UAT gate/auth protocol collision without bypassing CRM authentication.

Staging database checkpoint: the migration was applied transactionally after a private backup and followed by the existing security-lockdown SQL. The dedicated reloo-staging-support-purge.timer runs every 15 minutes and was started successfully; it targets only the staging database. Production services and production data were not migrated by this operation. Before publication of the new app image, its current automated check evidence is required by the UAT exception packager.
