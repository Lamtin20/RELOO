# Commerce layout polish — 13/10/2026

Desktop utility sections use a balanced two-column composition for Shorts/cashback and compact income/safety cards. Six rental benefits describe actual general advantages without claiming free delivery, insurance or maintenance. Product artwork remains the licensed Fluent Emoji 3D assets.

Mobile web uses the app account/dashboard/navigation layout at widths up to 900px. Bottom navigation is smaller, has rounded upper corners, subtle press/morph feedback and honors reduced motion. Safe-area padding, viewport-fit cover and a matching theme color extend the header background around supported iPhone cutout/status areas. Safari-owned browser chrome cannot be drawn over by a website; no physical iPhone validation is claimed.

First-party banners advance every eight seconds while visible. Hover/focus or the explicit pause control stops advancement. Hidden/offscreen pages do not advance; motion becomes an instant transition with reduced-motion enabled. Email placeholders are “Nhập mail của bạn”.

Email OTP request: current registration uses a confirmation link, not an email OTP entry flow. Smart Key already has `autocomplete="one-time-code"` and numeric input, but its code comes from TOTP. A web app cannot read a customer's inbox to reveal a code; the OS may offer autofill only for supported authentication messages. No code is exposed by server responses or fabricated. Gmail sender authorization remains incomplete as recorded in earlier releases.

Validation: 130 tests passed; targeted lint zero errors. Browser checks confirmed automatic banner movement and stable pause over two 8.5-second observation windows, six benefits and app account layout on mobile web. Release/build/server and Samsung checks follow after deployment.

Release: local and server production builds passed; app health check passed and all 13 release files matched SHA-256 audit. Backups are under `/srv/reloo/backups/commerce-finish-20261013`. Android `1.0.1-beta.20261013.1836` / versionCode `29864856` was built, published and installed on Samsung. Final on-device visual QA was limited by the Samsung lock screen: the WebView reported zero viewport size while locked, so no successful fresh Samsung screenshot is claimed. The app DOM contained the six benefits and compact navigation, but those measurements do not substitute for unlocked visual inspection.

Safe-area simulation at 47px confirmed header top=0, matching background and content starting below the inset. Physical iPhone/Safari verification remains outstanding. Desktop and mobile-web artifacts are in `output/playwright/finish-*`; validation logs are in `output/verification/finish-*`.
