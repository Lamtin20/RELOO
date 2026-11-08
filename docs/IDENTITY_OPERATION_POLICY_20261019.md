# Identity access policy — 19 October 2026

## Purpose and operation matrix
Identity approval is separate from contact verification, role, residency, account activation and fraud clearance. `kycLevel=L2/L3`, submitting documents, scanning QR or a client flag do not establish completion. Approval comes from the existing `verified_identities` row linked to a reviewed submission; VALID/EXPIRING and legacy approved NO_EXPIRY records qualify. Missing, pending and expired records do not. Server session exposes a derived boolean and status, never identity evidence.

| Action | Identity requirement |
| --- | --- |
| Browse/search/detail, guest viewing | None |
| Buyer inquiry / purchase / buyer confirmation | No CCCD requirement; existing contact/account/risk rules still apply |
| Publish/edit rental or sale listing, publisher media import | Actor must be approved |
| Rental inquiry, proposed agreement, acceptance / pickup / new payment / extension | Actor approved; other participant checked for new commitments |
| Scheduled rental listing/need/offer/draft/booking/acceptance | Approved actor; owner/renter approved before commitment |
| Existing return / cancellation / dispute / refund acknowledgement | No new identity-approval gate; resource, state, evidence, other security checks remain |
| Identity/profile/settings and admin verification work | Accessible through existing permissions, not gated behind already being verified |

BUY demand posts are buyer activity; asset owners responding to needs require approval. General chat retains active/risk checks without making CCCD compulsory for a buyer to ask a question. A returned item or cancelled reservation whose owner is no longer eligible is paused rather than silently republished. Closing a previously reserved sale is not a new publication. No existing order or evidence is deleted.

## UI and mobile/web
Shared root boundary blocks rental/posting entry for authenticated unapproved accounts, preserving the selected URL rather than submitting operations. Guests retain sign-in/browsing behavior. Shared dialog gently reminds at Home/Account once per tab/account; it can be dismissed to browse/buy. A protected action or server identity denial opens it again, including stale client status. Verification starts through the existing guide and privacy/consent flow. No auto-approval or document upload is added.

Account summary and header show a real identity status badge; Account adds an explicit warning. Email/phone verification is not presented as identity approval. New copy is centralized vi-VN/en-US. Native dialog provides focus containment, Escape/native Back dismissal, short mobile-safe layout and no new animations. Consent/other visible modal prevents the optional reminder from stacking; closed native dialogs do not suppress reminders. A tab-scoped functional reminder flag stores no documents/contact data and is cleared when the observed account changes. Blocked storage falls back to in-memory reminder state.

## Enforcement and migration
API requireAccount adds an explicit identity requirement (default on listing_write; rental writers opt in). Counterparty reads are server-derived and resource-scoped. The existing scheduled path applies the same record test after idempotent replay and before new mutations. Client input cannot grant verified status. Buyer paths do not opt into identity enforcement.

`deploy/vietnam/identity-operation-policy.sql` adds backend-only approval/buyer-active helpers and commit-time guards for listing publication, new rental agreement states and scheduled orders. Buyer-active is cloned from the installed active-account routine with only its identity-expiry clause removed; unknown source aborts migration. Purchase/chat/BUY-demand routines use it only in the intended contexts and keep original ownership, state, risk, price, idempotency and locking logic. Rental recovery uses the same active-account checks without requiring a renewed CCCD. Full server quote, holds, Smart Key and transaction integrity checks remain.

The migration is non-destructive and transactionally followed by security-lockdown.sql. Public/anon/authenticated schema/RPC access remains forbidden. No secret enters the browser. Existing verified rows and identity-review process are reused; no provider, fee or new sensitive collection is configured.

## Configuration blocker
Read-only production preflight found the identity controller's legalName, address and privacyEmail unset in CRM. Existing privacy policy intentionally blocks document submission until those real details are provided. The user already chose to fill them in CRM; this release does not invent them or bypass that gate. Once populated, existing public-business/policy reads pick them up. Until approval can be completed, unverified accounts cannot perform the newly protected tasks; viewing/buying remains exempt from CCCD, subject to ordinary account rules.

## Validation
Evidence under output/identity-access distinguishes local SQL/HTTP fixtures, browser fixtures and production checks. Policy tests execute real source routines in PGlite: unverified/expired buyers, publisher/renter rejection, unchanged risk restrictions, new bilateral booking approval, returns/cancellation, idempotent migration, and routine-only rollback retaining orders created meanwhile. Browser fixtures exercise optional popup/dismiss, account warning, blocked rental/post, approved access, expired denial and anonymous viewing without real documents or transactions. Local HTTP test forges identityVerified/kycLevel; unverified actor receives 403 while approved actor creates only a TEST draft.

Some WebKit combined navigation runs report request cancellations/access-control messages during navigation; these are retained, not recorded as a blanket error-free iPhone pass. No actual iPhone hardware/simulator is connected. Previously reported browser-level iPhone loading failure is not claimed fixed by this identity-policy change.

## Rollout / rollback
1. Encrypted full source/DB backup, staged build and disk/health checks.
2. Under release lock export existing affected routine/trigger definitions with identity-policy-rollback-export.sql into an encrypted rollback artifact.
3. Apply policy + security lockdown in one DB transaction. On failure abort/restore prior routine definitions; never restore a database over live writes.
4. Activate healthy image, synchronize K3s and verify every renderer/build/source hash plus public read-only probes.
5. Rollback decrypts the routine-only artifact in a transaction, restores security lockdown and the prior image/source, then re-syncs renderers. Newly created orders remain. No production identity documents or money are used for tests.
