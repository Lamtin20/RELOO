# Rental Care: calendar sync and product recommendations

## Current experience update — 17 October 2026

See [EXPERIENCE_IDENTITY_20261017.md](EXPERIENCE_IDENTITY_20261017.md). It supersedes the original setup UX below: interests are now explicit choices separate from behavioral consent, a single onboarding sequence asks for calendar permission, and Android creates/reuses its own local RELOO calendar after OS approval. Normal calendar-menu entries are removed; privacy/recovery controls remain available. Existing Google scopes, job leases, consent checks and ownership guards remain in force.

Implementation scope (2026-10-17): extend existing Next.js, authenticated backend, operations worker, rental agreements and Nội Khu; do not introduce a separate application. No standalone Rental Care implementation or specification was found in the repository/available pasted documents. This module covers care reminders, not the old demo's insurance/escrow product named Reloo Care.

## Implementation decisions before coding

1. Add backend-only calendar connections, OAuth transactions, normalized rental revisions and per-connection event mappings. Database triggers capture confirmed/changed/cancelled/returned rentals in the same transaction. Google workers use leases and deterministic event IDs; device jobs use the same revisions and acknowledgement contract. Logout stops device work, never deletes a shared calendar.
2. Google OAuth is separate from login/Gmail. Request `openid email`, `calendar.app.created` (only app-created calendars/events), and `calendar.calendarlist.readonly` (calendar metadata for destination/recovery, not personal event contents). Use a dedicated RELOO calendar, PKCE, one-use state, encrypted refresh tokens, verified account display and explicit confirmation. A different email requires an additional acknowledgement. A changed RELOO email never silently transfers the grant. No real OAuth is claimed without credentials and a user grant.
3. Calendar creation with an unknown outcome is reconciled by an exact random connection marker; never blindly repeat a possibly successful create. Event creation uses a deterministic provider-compatible ID and checks RELOO ownership before editing/deleting. Remote calls never hold a database transaction open.
4. Native destination means a writable **local, independent** calendar. Exclude Google/account-synced calendars to avoid mirrored duplicates. Do not pretend an OS calendar picker exists in a browser. Native permission is requested only on an explicit setup action; no repeated automatic prompts. Android code will be compiled locally if installed tools permit; iOS requires Mac/Xcode and real-device acceptance separately.
5. Add an independent personalization consent/epoch with bounded versioned events. Store product/category signals, never raw search text, chat, calendar content, financial/identity input or background coordinates. Guest browsing uses contextual suggestions without a persistent guest profile; no automatic guest-history merge. Logged-in consent is backend-authoritative across web/app.
6. Rule-based ranking uses configurable weights/decay, bounded repeats, negative feedback and diversity. Filter active/allowed assets, location, known calendars and blocks before ranking. Do not modify trust, deposit or fraud scores. Server-generated completed-rental/review signals cannot be forged by client events. Raw events/profile TTL and reset epochs prevent deleted events from rebuilding profiles.
7. Integrate settings at Account > Calendar and reminders / Personalization, native first-login setup, foreground device reconciliation, home/explore recommendation groups and product/search/save/request signals. New UI text uses vi-VN/en-US dictionaries. No automatic production migration/deployment or external analytics export.

## Planned verification

Persisted SQL tests for consent/replay/reset/account isolation, calendar order revisions, leases, permissions and lifecycle; adapter tests with a clearly labelled fake Google transport for token revocation, wrong account, deterministic event retry and calendar creation uncertainty; real Next HTTP and browser tests against an isolated local database; existing security/Nội Khu regressions; production build and Android compile where possible. Real Google OAuth and OS permission/device sync remain separate acceptance items until credentials/devices are available.

## Primary provider references checked

- Google scopes: https://developers.google.com/workspace/calendar/api/auth
- Calendar insert: https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
- Calendar metadata list: https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
- Event insert and caller-specified base32hex IDs: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Android Calendar Provider and READ/WRITE_CALENDAR: https://developer.android.com/identity/providers/calendar-provider
- Apple EventKit: https://developer.apple.com/documentation/eventkit/accessing-the-event-store

The Google/Android primary pages were fetched successfully; the Apple landing page is client-rendered, so native APIs must also be checked against available SDK declarations/documentation before claiming a build. The browser search provider was unavailable; no invented provider endpoint is used.
