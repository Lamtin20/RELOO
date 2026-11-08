# Connected services and operational status

See [market data and cashback setup](MARKET_DATA_AND_CASHBACK.md) for the pricing queue, source status, affiliate catalog, required partner credentials and consent controls.

## Current verification

- GHTK: a real production fee request succeeded on 2026-10-08 using the token stored only in `.env.local`. Fuel surcharges are included in the returned shipping fee; they must not be added a second time. A fee result with `delivery: false` is displayed as not confirmed for delivery.
- Supabase: the RELOO project was confirmed paused and resumed through its dashboard on 2026-10-09. Auth settings return HTTP 200, Google is enabled, and the three feature migrations were applied after a successful rollback-only check. Production Google sign-in and callback were verified on `https://reloo.vn` on 2026-10-10 (Asia/Saigon); the existing test account has a real session and a completed PENDING profile. The Google app remains in Testing. Backend activation and phone-screening gates remain enforced.
- External phone sources: neither an authorized CheckScam phone API contract nor a ChongLuaDao phone lookup contract was available. CheckScam's website returned HTTP 403 during research. The application does not scrape it, impersonate an API or translate failed retrieval into NO_MATCH.
- Affiliate: ACCESSTRADE's official Shopee tracking-link, TikTok Shop v2 product feed/link and order-report contracts have been implemented. No publisher credential has been supplied, so no live affiliate link, conversion or cashback payment has been claimed.

## GHTK

Set `GHTK_API_TOKEN`, optional `GHTK_PARTNER_CODE`, and `GHTK_API_URL` (production or the documented staging endpoint). No key belongs in `NEXT_PUBLIC_*` variables, source code, screenshots or git.

`POST /api/ghtk/quote` accepts province, ward and optional street/district for both addresses, weight in **grams**, declared value in VND, and road/fly transport. `/shipping` and the rental request page expose the estimator. The request does not create a shipment or charge a fee. Return shipping is quoted separately.

`POST /api/ghtk/webhook?hash=<GHTK_WEBHOOK_SECRET>` supports the documented form payload and JSON. Set a separate random webhook secret and register the HTTPS callback with GHTK. This is a shared callback secret, not a fabricated GHTK HMAC signature. Register actual label/partner mappings in `shipping_shipments` before accepting callbacks. Unknown shipments fail, duplicates are idempotent, and older events cannot replace newer status. No shipment is created by the estimator.

Shipper advisory codes 123, 127, 128, 45, 49 and 410 are recorded as events but never replace the canonical shipment state, as required by GHTK's webhook documentation.

Official references:

- https://api.ghtk.vn/docs/submit-order/logistic-overview/
- https://api.ghtk.vn/docs/submit-order/calculate-shipping-fee/
- https://api.ghtk.vn/docs/submit-order/webhook/

## Accounts and fraud screening

See `docs/GOOGLE_AUTH_SETUP.md` for the current signup/password policy, project configuration, Google PKCE onboarding and the additional auth migration. Input validation is now separate from source/storage availability.

1. Configure a working Supabase URL, anon key, service role key and database connection in `.env.local`.
2. Apply existing schema migrations to a new database, then run `node scripts/apply-feature-migration.mjs`. The feature migration uses a transaction and tracks its application separately; do not blindly rerun the old migration script against an already populated schema.
3. Set `APP_ORIGIN`, configure email confirmation and allow `/auth/callback` in Supabase's redirect allowlist. Signup and sign-in use Supabase; arbitrary demo passwords/OTPs and role switching are no longer the authentication path.
4. Bootstrap the first administrator through a trusted database operation after confirming their identity and phone ownership. Set their `role`, `activation_status='ACTIVE'`, `verification_method='ADMIN_REVIEW'`, finite `screening_valid_until`, and insert a `security_audit` event in the same transaction. No web request can nominate itself as admin.
5. Use `/admin/risk` to record reviewed evidence, review cases, receive appeals and record time-limited IP signals. `/safety` lets a user see their screening status and submit evidence or an appeal.

States have distinct meanings:

| State | Meaning | Automatic activation |
| --- | --- | --- |
| MATCH | Fresh matching evidence | Blocked; RiskCase opened |
| NO_MATCH | Complete, fresh negative responses in the checked scope | Allowed only with verified account requirements |
| UNKNOWN | Insufficient scope/evidence | Pending |
| UNAVAILABLE | No authorized connection or source failure | Pending |
| STALE | Evidence/result expired | Pending; existing unresolved restrictions stay blocked |

The current implementation reports CheckScam UNAVAILABLE and ChongLuaDao UNKNOWN for phone screening. Reviewed reports are explicitly labeled `reviewed_evidence`; importing them is not represented as an external API request. Add a source adapter only after obtaining the provider's documented, authorized contract and credentials, then normalize its genuine responses with expiry and evidence.

`requireAccount()` verifies Supabase cookie or bearer sessions, maps the server-side profile, checks activation, expiry, unresolved cases and scoped IP restrictions. Posting/editing, inquiries, chat and affiliate conversion use this gate. SQL triggers and service-only RPC permissions protect the database too. Socket.io authenticates the token, checks membership and restrictions for each event, and broadcasts only messages already persisted by the HTTP backend. Public marketplace responses omit private profiles and third-party orders.

Forwarded IP headers are ignored unless `TRUST_PROXY=true` and the deployment's proxy strips attacker-supplied headers. IP signals always identify one account and one operation, expire in 1-24 hours and do not restrict other accounts sharing the same address. Request rate limits are process-local; use a shared rate-limit store when deploying multiple instances.

Evidence, screening checks, audit and cashback ledger entries are append-only. Clearing a case requires a reason, evidence and a finite verification lifetime; source screening status is preserved instead of falsely changed to NO_MATCH. Clearing a case does not revoke a phone signal; future matches require another review. Recheck accounts when their clearance expires.

## Affiliate and cashback

Use a publisher account approved for **incentivized/cashback traffic**. A normal affiliate account does not automatically authorize paying rebates. Set:

```env
ACCESSTRADE_ACCESS_KEY=
ACCESSTRADE_SHOPEE_CAMPAIGN_ID=
AFFILIATE_CASHBACK_APPROVED=false
AFFILIATE_REWARD_SHARE=0.7
```

Keep the approval flag false until the provider confirms this traffic model. The share is the fraction of approved publisher commission returned to the customer, not a fabricated store-wide discount.

`/cashback` accepts Shopee VN and TikTok links, creates a link bound to an authenticated/eligible account, shows a live TikTok feed when connected, and exposes conversion history. URL allowlists reject credentials, non-HTTPS links and lookalike domains. RELOO never fetches user-supplied URLs itself; the documented provider API resolves supported short links.

Attribution uses a random click id in `utm_content` and `sub1`, with the agreed reward share stored on the click. `POST /api/affiliate/sync` is admin-only and consumes `/v1/order-list` in explicitly bounded pages/ranges. Schedule authenticated calls or a server worker to cover every page within the provider's rate limits. Pending, approved and rejected conversions are separate. Only confirmed, wholly approved orders contribute approved rewards; rejection/commission corrections append ledger adjustments, and replay/out-of-order reports cannot double-credit.

Missing attribution is skipped and never guessed. Verify actual returned tracking fields and campaign reports with the provider before launch. Mixed-status orders remain pending until their complete status can be determined. The UI does not claim a signup bonus, arbitrary cashback percentages, instant payout or a 48-hour approval promise. Automated payouts have not been opened.

Official contracts:

- https://developers.accesstrade.vn/api-publisher-vietnamese/authentication
- https://developers.accesstrade.vn/api-publisher-vietnamese/tao-tracking-link
- https://developers.accesstrade.vn/api-publisher-vietnamese/tich-hop-api-publisher-at-cho-chien-dich-tiktok-shop/version-2-updated-version/create-link-v2
- https://developers.accesstrade.vn/api-publisher-vietnamese/tich-hop-api-publisher-at-cho-chien-dich-tiktok-shop/version-2-updated-version/tiktok-product-search-v2
- https://developers.accesstrade.vn/api-publisher-vietnamese/lay-danh-sach-don-hang-v2

## Verification

```powershell
node --test tests/features.test.mjs
npm install --prefix output/verification @electric-sql/pglite --no-audit --no-fund
node scripts/verify-feature-schema.mjs
node scripts/check-new-integrations.mjs
node node_modules/next/dist/bin/next build --webpack
```

The PGlite fixture is an isolated PostgreSQL test database, never an application fallback or a simulated external source. It verifies activation, appeals, immutable evidence/audit, grants, guarded writes, chat ownership/idempotency, cashback reversal and webhook ordering. Browser screenshots live under `output/playwright/`.
