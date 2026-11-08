# RELOO Nội Khu — implementation contract

## Scope and architecture decision

Integrate into the current Next.js App Router website at `/noi-khu`, its existing Capacitor web shell, Supabase PostgreSQL backend and CRM. No additional app/server architecture is introduced. Existing authentication/account restrictions, CRM MFA/permissions, WebP importer and operations worker remain authoritative. The master specification found is `../RELOO_Master_Specification_v2.0.md`, not v1.0; this feature belongs to RELOO Real and does not implement a UE world.

The marketplace asset remains the canonical product. Neighborhood listings add service scope, hierarchy, handover settings, pricing and calendar. Bookings have a dedicated authoritative lifecycle; shared availability must also exclude existing marketplace transactions and rental agreements. Public coordinates, residency, current GPS and browsing selection are separate concepts. No background tracking.

## Implementation sequence

1. Add additive, backend-only schema: sourced location hierarchy/version history, geometries, moderation/merges, membership/verification/invites, listing terms, needs/offers, policy snapshots, bookings/holds/blocks, OTP/checklists, extensions/disputes, outbox/delivery/preferences and sync jobs.
2. Add domain/i18n registries and transaction-scoped RPCs for authorization, quotes, calendar locking, booking actions and atomic outbox creation. Add shared web/native API handlers; preserve legacy marketplace schemas.
3. Add responsive user and CRM screens, manual selection without GPS, explicit location suggestions, owner and renter workflows. Render all new product text through vi-VN/en-US dictionaries.
4. Connect bounded maintenance/outbox/source-sync processing to the existing operations worker. Real external provider configuration is optional and never inferred from a demo.
5. Exercise isolated PostgreSQL-compatible storage, API and browser workflows using labelled test actors and data; export desktop/mobile screenshots and an acceptance matrix.

## Assumptions that can be changed

- Billing uses hourly or 24-hour units rounded upward, integer VND, Asia/Ho_Chi_Minh input. No platform/insurance charge is invented; policy fees default to zero and are versioned.
- Owners may accept manually or enable instant booking for eligible renters. Owner and payment holds expire; active/return-pending/disputed orders keep blocking the calendar until resolved.
- Marketplace identity verification is separate from residency verification. Existing valid identity/account gates apply to booking. Neighborhood membership never overrides them.
- Residency starts SELECTED; only a reviewed membership or controlled single-use invitation grants VERIFIED. No CCCD upload is requested for residency. Partner verification is disabled until a real authorized adapter is configured.
- No real payment/escrow provider is assumed. Manual owner acknowledgement of direct payment is explicitly labelled; authenticated sandbox webhook tests use a separate non-production adapter. Deposit/refund are separate recorded statuses; no automatic money deduction or escrow claim.
- A policy must be reviewed and published before an area is enabled. Fees/cancellation terms are displayed and snapshotted. New catalog entries/geometry changes remain pending until review. Unknown source/terms never silently publish.
- New locations can be submitted for review; names are aliases, never IDs. Multiple residences are allowed; visibility defaults private. Handover details are participant-only after confirmation.
- In-app notifications use a transactional outbox and existing notification inbox. Match/marketing consent is separate and off by default. Push/email require configured adapters; failures remain visible rather than reported sent.
- No production migration, paid configuration or deployment is authorized by this request. Test data is isolated and clearly labelled.

## Evidence and handover

See `docs/NEIGHBORHOOD_OPERATIONS.md` for the final state machine, event matrix, source terms, environment settings, rollout/rollback and measured test results. No completion claim is made here before implementation and verification.
