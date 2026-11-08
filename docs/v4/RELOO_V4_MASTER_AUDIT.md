# RELOO V4 master audit

Audit dates: 2026-11-07?2026-11-08 (Asia/Ho_Chi_Minh). Status: PARTIAL_IMPLEMENTATION / RELEASE_BLOCKED. This is an audit, not a replacement business specification.

## Verified facts

Owner permits read-only temporary reference to `docs/RELOO_PRODUCT_SPEC.md`. The requested `RELOO_Master_Specification_v1.0.md` is absent from searched non-generated repository files and named paths in visible `git log --all`. Visible history contains `24c37bc` and `2777d09`; the heavily modified worktree contains requirements not committed in that history. No claim is made about missing remote/private history. Existing specifications are unchanged.

Verified stack: Next16.4.2/React19.2.4 modular monolith, shared API/server authorization, Socket.io, PostgreSQL/Supabase migrations, existing MapLibre6.16 adapters. `mobile/capacitor.config.json` and native projects prove Android/iOS source exists and loads `https://reloo.vn`. Source existence is not app-store, device or simulator acceptance. Four primary Mini Apps are declared in `lib/product/modules.js`; Neighborhood, rental care, support, content and admin add shared services.

## V4 comparison

| Requirement | Existing evidence | Gap/conflict | Disposition |
|---|---|---|---|
| One authoritative business source | Product spec + rules registry + state/API docs | Requested Master filename absent; old notes can contradict newer owner revisions | SSOT proposal, owner approval required |
| Real-only scope | Existing spec contains historical UE contract text | V4 excludes World/UE5 | Preserve source; do not implement excluded work |
| Shared brand/design | Palette, CSS tokens, design docs, infinity assets/mascot | Many global CSS layers; token/interaction coverage incomplete | Small shared foundation improvements |
| Authentic images | User upload/WebP pipeline, provenance registry | Registry INCOMPLETE; no blanket image-rights approval; raw originals not retained by current normalizer | Content/retention review required |
| Android/iOS | Capacitor8.5.3, Java/Swift/plist/manifests, iOS workflow | No current real-device startup/ANR/battery/accessibility evidence | NOT_TESTED, not web emulation PASS |
| Visual AI | Guarded suggestions, source matching, adapters | Primary defaults agent-reach; Google preferred by V4 but real access unavailable in prior evidence | Explicit provider decision/config acceptance; no hidden switch |
| Maps | OSM/MapLibre, private pin, public approximation, timer code | Tiles/routing/staging not accepted; <20m GPS is a device estimate | PARTIAL/BLOCKED |
| Rentals/used | Existing listing, quote, inquiry, purchase and identity code | Full current staging/production journeys not accepted | Preserve transactions; targeted regressions |
| Stays/jobs | Stays preview/sandbox, jobs coming-soon flags | No evidence of complete live services | BLOCKED; never fake inventory/confirmation |
| Locale | vi/en dictionaries, device/account language choice | V4 proposes Vietnamese default; current device-first behavior needs explicit reconciliation | NEEDS CONFIRMATION; unchanged |
| Quality | Existing Guardian/CI and524-test historical baseline | Current source evidence must be regenerated; manual decisions still required | No bypass or invented95/100 score |

## Prioritized findings

Repository inventory retained under `output/v4/repository-inventory.json`:2269 files,191 API route handlers and107 pages in the bounded non-generated enumeration. This is inventory coverage, not a claim that every line or business journey was audited.

No P0 exploitable defect is confirmed by this bounded review; this is not proof none exists.

| ID | Priority | Evidence / impact | Resolution / acceptance |
|---|---|---|---|
| V4-01 | P1 release | Guardian lacks current staged/native/accessibility/legal acceptance | Complete real evidence; no source-only release |
| V4-02 | P1 accessibility | SearchBox uses fixed suggestion ID; headers can render multiple SearchBoxes | Implement useId, dialog linkage, keyboard dismissal; verify two instances |
| V4-03 | P1 experience | ListingImage assumes IntersectionObserver and does not forward dimension hints | Guard unsupported API, bounded error progression and dimensions; browser fixture tests |
| V4-04 | P1 trust | Asset provenance registry incomplete | Owner/IP verifies source/hash/license; do not substitute generated product/property photos |
| V4-05 | P1 platform | Native metrics/build/device journeys absent in this run | macOS/iOS and Android device validation before platform PASS |
| V4-06 | P1 business | Stays/jobs/live map dependencies blocked | Keep truthful availability; approved providers/schema/workflows needed |
| V4-07 | P2 accessibility | Marketplace shell has no bypass link | Add localized keyboard skip to main with visible focus |
| V4-08 | P2 maintenance | Many CSS overrides and duplicated literals | Add small portable primitive contract; migrate by measured module regressions |
| V4-09 | P2 localization | Search interaction labels hard-coded vi | Shared vi/en labels; category/content localization still separate |
| V4-10 | P2 performance | No field p75/endpoint load percentiles available | Instrument approved staging/RUM; do not interpret dev navigation timing as CWV |
| V4-11 | P1 accessibility | Axe on mobile Explore flagged4 low-contrast button labels | Use established primary/secondary-text tokens; recheck computed contrast and axe |

## Implemented changes, assumptions and risks

Only controlled shared foundations described in `RELOO_V4_IMPLEMENTATION_LOG.md` are implemented. No new business assumptions, fake inventory, payment policy, production data, external paid account or World code changes. Screenshot fixtures use anonymous/empty catalog states. Expert role simulation is one AI's structured perspectives, not twelve independent human or agent reviews; independent execution is unavailable in this session. Numerical premium score is NOT_ASSESSED. Full ecosystem acceptance remains BLOCKED.
