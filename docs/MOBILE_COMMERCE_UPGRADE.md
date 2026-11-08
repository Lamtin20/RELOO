# Mobile and commerce update ? 12/10/2026

## Deployed

- Visible `dd/mm/yyyy` date controls; bounded mobile inputs and compact bottom product actions. The Samsung review additionally found and fixed the Explore location grid pushing the GPS button beyond the screen.
- One horizontal swipe row for category groups with 14 matching self-hosted SVG illustrations, keyboard tab navigation and corresponding group panels.
- Redesigned clip import/publish surfaces with ???ng s?n ph?m? / ???ng Clip?; contextual bottom navigation. Populated Shorts has no create/play overlay buttons. Stable player identities and backward buffers retain recent clips.
- Purchase requests with server-derived price snapshots, seller confirmation, reservation, handover, buyer completion, cancellation, disputes, CRM support resolution and an append-only timeline. Rental acceptance and sale reservation share asset locks. Direct payments remain UNVERIFIED without genuine payment evidence; this is not an integrated payment checkout.
- Customer Smart Key uses verified Supabase TOTP, account/session-bound receipts expiring after 15 minutes and atomic single-use confirmation for purchase/rental actions, withdrawals/cancellation and account deletion. CRM retains its existing scoped eight-hour MFA session, and legal documents support editing and selected batch publication. Smart Key does not cover every application mutation.
- Notifications and follows persist on the server. CRM controls ten rule families; registration, messages, rental/order journeys, interests, follows and publications feed notification automation. Workers recheck current marketing consent. HTML email previews exist, but delivery still depends on the Gmail grant. OTP delivery remains governed by the authentication service.
- Identity intake requires front/back camera photos, server-stored QR and a short live recording with randomized server poses. QR information is locked; customers see only card number and expiry. Private evidence is encrypted. Local motion/anti-spoof/face comparison supplies review signals; OCR expiry and identity still require staff/provider review.

## External connections still incomplete

Gmail sender is exactly **norepy.reloo@gmail.com**. OAuth client is configured, but metadata verification after deployment confirmed **no refresh token / user grant**. Callback uses PKCE, sender verification and safe base64url cookie encoding. Google redirect allowlist must include `https://crm.reloo.vn/api/crm/gmail/callback`. OAuth currently requires the initiating CRM browser session. Existing Chrome automation could not access the authenticated Google session: automatic Computer Use review could not verify its URL; Playwright extension attachment was unavailable. No password, browser cookie or token was extracted.

VNPT readiness metadata last checked 10/10 reported OCR authorization failure (401) and zero available trial requests. Local live-capture screening is implemented and rejects blank video; it is **not authoritative or certified eKYC**, and no real-person successful verification was asserted. Genuine provider access and consented live validation remain necessary.

## Validation and release

- `node --test tests/*.test.mjs`: **123 passed**, including atomic Smart Key rollback/replay, purchase roles/version/price, rental conflicts, support resolution, follows/consent and randomized identity challenges.
- Production build passed; targeted lint: zero errors, four warnings. Server migrations committed atomically; app/worker healthy.
- Physical Samsung SM-N950N WebView reviewed at **411px** on rent, product, clip creation, purchases, security, identity, notifications, Explore and account routes. Body width remained 411px; Explore GPS right edge after fix is 378.67px. All 14 category images loaded in one row.
- Shorts down/back on Samsung: same player, readyState 4, playing, **zero loadstart**. This bounded check does not guarantee zero delay across all networks or clips.
- Blank-video negative test on deployed local KYC: rejected with KEEP_ONE_FACE_VISIBLE. No real user biometric submission was made during testing. The Samsung account had no chat thread, so populated-chat UX was not fully verified.
- Android **1.0.1-beta.20261012.2119**, versionCode **29863579**, built, published, installed and opened on Samsung.

Backups: `/srv/reloo/backups/mobile-phase2-20261012-continued` (source and database). Phase 1 backups remain under `/srv/reloo/backups/mobile-polish-20261012`. Phase 2 migrations after the existing schema: identity-live-capture ? identity-qr-intake ? smart-key ? purchase-workflow ? notification-rules ? smart-confirmations.
