# Native app launch — 24 October 2026

Scope: native first-run introduction, returning launch, existing declared interests and shared loading UI. Guardian RULE-005/006/007/010/016/020. No new SDK, server data field, location/calendar permission or behavioral tracking enabled. Native detection uses the existing Capacitor hook; ordinary website visits do not show this introduction.

First install: three full-screen steps: owner-supplied RELOO artwork; service illustrations covering stays, rentals, pre-owned goods and jobs without implying all are live; then interest selection with existing category identifiers. Select zero through five categories. Continue leads to the existing sign-in/register page. Choices stay on the device using the existing 30-day guest-interest store. A change event updates guest recommendation state. Account persistence still requires the existing explicit confirmation flow after authentication.

Returning install: restore the session behind a welcome screen and circular spinner. It closes when the existing auth initialization completes; no artificial minimum delay or invented progress percentage. Existing installs with the former setup marker skip the new first-install slides. Reopening from background does not unnecessarily repeat slides. Intro completion is a local device marker, not an account or consent record. Reinstallation/storage clearing may repeat onboarding.

The original experience setup is suppressed for anonymous native startup to avoid competing modal dialogs; authenticated account preference confirmation remains available after introduction. No calendar permission is requested by the new launch flow.

Artwork supplied by the owner from Downloads/Màn hình chào mừng logo vô cực.png. Original preserved outside repository; WebP derivatives generated with scripts/import-web-image.mjs. A cropped derivative removes the baked-in loading text/dots so real HTML loading can animate and be localized. Usage instruction recorded in asset-provenance.json; ownership/license paperwork remains pending, not invented.

Shared RelooLoading now renders a circular status animation with reduced-motion support. Other dedicated progress/skeleton components retain their purpose-specific behavior. Welcome/intro support keyboard focus, dialog back behavior and scrolling; real-device cutout/keyboard/native launch and iOS cold-start remain NOT_TESTED. Installed native clients still load production and have not received this local implementation.

Evidence: output/playwright/launch-20261024 and output/launch-*.log. Browser test uses simulated native detection, synthetic auth and a delayed response to exercise the genuine pending state. No real account creation, personalization write, notification, booking or payment was performed. Build/Guardian results must be read from the actual logs; no deployment is claimed.
