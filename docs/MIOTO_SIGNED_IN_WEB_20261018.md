# Mioto signed-in website review — 18 October 2026

## Observed with the user's logged-in browser
Read-only review on the official `https://www.mioto.vn/` site, desktop 1440px and mobile 390px, using the existing owned `mioto-auth` browser session. Screenshots, labels and route observations are retained under ignored `output/rea/mioto-auth-web/web-member-*`, `member-check.txt`, and `member-more.txt`. Profile screenshots mask inputs/contact fields; none are shipped as RELOO assets. No credentials, auth storage, private messages, payment details or document uploads were read/exported or changed.

| Surface | Actual observation | RELOO application |
|---|---|---|
| Guest home | Public location/date search; desktop sign-in/register and mobile account menu | Preserve public browsing and the guest-only controls released previously |
| Member home | Main search remains; desktop adds a direct My trips link, messages/notifications and account identity; mobile has notifications/messages/menu | Add direct Rentals access in the existing desktop member header; preserve existing mobile account/inbox actions |
| Desktop account | Left navigation, account card, separate license verification, payment and item sections | Add an in-page section navigator beside existing RELOO account content; retain all real profile and transaction modules |
| Mobile account | One-column content with compact account navigation selector | Add a compact native section selector; keep profile fields visible in the page rather than adding extra routes |
| Verification | Contact verification and driving-license verification are shown separately | Keep activation separate from identity verification; do not derive verified identity from activation or invent phone/email verification data absent from the API |
| My trips | Current/history tabs and an explicit empty state in the reviewed account | Existing RELOO shared orders and status/count buckets remain; header leads directly to that module |

The mobile account selector is an observed UI pattern; RELOO uses its own accessible native select/anchors, not copied Mioto code. The observed profile fields, driving-license requirements, account points, insurance and card-payment services are not imported into RELOO business rules.

## Implementation
- `Header.jsx`, `account-session.css`: direct member Rentals link, using the existing `/dashboard/orders` route. Guest does not receive the private link.
- `AccountHub.jsx`, `AccountSectionNav.jsx`, `account-hub.css`: desktop sidebar and mobile section selector for overview, pending work, profile, verification, tools, settings, offers and support. Anchors navigate within the same page; no duplicate account pages. IntersectionObserver updates the current section. Jump respects reduced motion and moves keyboard focus to the destination.
- Inline personal profile, identity entry, server-scoped counters and account-switch boundaries are retained. No migration or new provider.
- `account-session.js`: labels in vi-VN/en-US through existing locale provider.

## Verification and rollout
Evidence under `output/auth-experience/member-web/`: existing guest/member/account-switch browser fixture flows, desktop/mobile section navigation, focus/scroll and responsive screenshots. Synthetic sessions are clearly separate from real production authentication. Scoped ESLint and staged production build must pass before activation; remaining avatar img warnings are not hidden. Deploy through existing encrypted backup/staging/health/renderer-sync process; rollback image/source without restoring live transaction data.
