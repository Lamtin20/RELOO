# Guest and member experience — Mioto reference, 18 October 2026

## Evidence and limits
- Observed live Mioto public website on desktop 1440px and mobile 390px: public search/location/dates and primary search action remain usable before login; desktop has login/register, mobile groups account entry in a compact menu. Screenshots and Playwright observations: `output/rea/mioto-auth-web/web-guest-*`, `guest-check.txt`.
- Observed actual signed-in Mioto Android app on the supplied Samsung with REA/ADB: home identity, then profile card and grouped rows (owner registration, favorites, addresses, verification/license, payment, reviews; benefits and policies separately). Passive screenshots in `native-home/`, `native-account/` and REA Evidence JSON. No logout, private messages, card details, identity documents or transaction actions inspected.
- After the user signed in, Mioto web was reviewed directly at 1440px and 390px, including home, account and the current-trips empty state. Findings and follow-up implementation are in `docs/MIOTO_SIGNED_IN_WEB_20261018.md`. No password/OTP or auth storage was extracted.
- REA bounded browser scenario provider failed in this environment. Ordinary Playwright supplied real web screenshots; supported REA Android capture supplied retained runtime evidence. No REA/toolchain update or security workaround was performed.

## Applied to existing RELOO
| Surface | Guest | Member |
|---|---|---|
| Desktop header | Search/location, public navigation, register + sign in; no private inbox/saved/manage links | Avatar/name, inbox, notifications, direct account/orders/listings/saved/verification links |
| Mobile header | Account sign-in entry instead of personal notification/saved action | Existing notification/saved/action controls |
| Public mobile navigation | Home, Explore, Account consistently on all public routes | Existing five destinations, including listing and messages |
| Account | Welcome card and login/register; collapsible language setting with flag, privacy settings and public help/policies | Profile + pending-work shortcuts first; visible verification entry and inline editable personal profile retained; grouped tools and sign out |
| Status | No invented personal counts | Existing server-scoped counts; activation labels no longer claim identity verification |

The user’s earlier requirements remain: inline profile is not hidden behind another click; language changes stay inside personal settings; normal successful login returns home while explicit rental/CRM continuation stays intact. No schema, payment, pricing, private-data permissions or account roles changed. Hiding an entry is presentation only; API authorization remains mandatory.

## Verification
- Existing auth navigation, UI language and security hardening tests: 9 passed (`output/auth-experience/tests.txt`).
- Browser fixture sessions A/B: guest controls hidden, three-item guest nav, member shortcuts above profile form, activation is not labeled verified, logout removes private UI, account B does not display A’s profile; widths 320/390/1440 without overflow and zero runtime exceptions (`flows.txt`). These are synthetic UI responses, not real logins.
- Scoped ESLint initially reports no errors; three existing avatar img warnings remain. Final lint/build/deployed evidence retained under `output/auth-experience/`.
- Screenshots viewed for guest account, member account and desktop member menu. Production validation is anonymous/read-only; no production test user or transaction is created.

## Rollout
Existing encrypted source/database backup and staged Docker build, backend health check, then Kubernetes renderer synchronization. Verify source hashes and exact renderer build IDs. No migration. Rollback image/source only; never restore database over live writes for this UI change.
