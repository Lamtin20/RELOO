# Third-party tracking register

| Component | Observed source behavior | Approval/runtime status |
|---|---|---|
| Google GA loader, lib/analytics/google-browser.js | Valid G-ID, production hostname, DNT/GPC guard, now independent persisted-consent guard; public route template only | Real production config/network NOT_TESTED; transfer and processor review required |
| First-party JourneyMeasurement/ProductAnalytics | Optional analytics consent gate; separate feature config; pseudonymous IDs | Local synthetic browser requests to be tested; server retention/current config pending |
| Supabase/auth/storage, shipping, map and identity providers | Service integrations are not automatically marketing trackers | Inventory each actual provider/purpose/location/subprocessor; NOT_VERIFIED |
| Meta/TikTok | No installed SDK established by static candidate discovery | Future SDK must be registered before loading; cookie cleanup patterns do not prove SDK active |

Categories: essential (auth/security and consent preference); functional (settings/drafts, classify actual necessity); analytics (measurement); marketing (advertising interests). Optional categories default false. Consent version2 expires after180days in current code; this is implementation configuration, not a statement of statutory duration. Settings allow change/revocation; DNT/GPC respected for measurement. Contracts and processing consent must not be merged by convenience.

CSP destination allowlists are not proof that a tracker was loaded. Consent scanner must observe actual requests fresh/denied/accepted/revoked, and record route/device/config/source identity. Production scanning is NOT_RUN; no probe of live users or credentials. Registry reference source web-policy is a candidate requiring triage, not a confirmed leak.

Purchase resume is a first-party functional session draft written only for explicit sign-in continuation, bounded20min/max10 and consumed after account return. It is not analytics/marketing and adds no third-party destination. Review transaction-draft notices separately from optional tracking consent.


Central CRM federation is a first-party functional authentication channel, not a tracker. A pinned CRM HTTPS backchannel transmits a one-time proof, opaque reference and minimum issuer/subject/MFA/expiry metadata. Independent host credentials stay on the server. No analytics consent is inferred and no marketing SDK is introduced. Local Ollama Agent Office connectivity tests use synthetic QA text only; customer transcripts are not imported.
