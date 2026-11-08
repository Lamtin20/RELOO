# Mobile form and focus correction — 17 October 2026

Changes: shared input/select/textarea focus uses the existing border with a subtle inset instead of an external rectangle. Keyboard links/buttons retain a visible, muted focus indicator. Account/CRM search wrappers no longer add a second outline.

Neighborhood dialogs use border-box sizing, viewport-bounded width, a single form column on phones, shrinkable date/time controls and 16px form text. Existing visualViewport height fitting and modal body scroll locking are retained. No global overflow clipping was introduced.

The homepage neighborhood teaser no longer nests the general container inside the marketplace container, aligning its edges with neighboring sections.

Verification: ESLint for the changed JSX/root layout passed. Playwright Chromium checked the actual development application with signed isolated neighborhood test sessions and mocked shared account auth/counts only; no production customer records, notifications or transactions were created. Dialog widths checked at 320/375/390/430/768/1440px, all fields remain within the dialog. Homepage edges match the neighboring needs teaser at 320/390/1440px. Focus computed styles and screenshots were inspected. Additional landscape/reduced-height checks are recorded in output/deployment/ui-polish-edge-browser.js. This is browser verification, not a physical iPhone/Safari test.

Screenshots: output/deployment/mobile-need-form.png, mobile-home-banner.png, mobile-search-focus.png. Deployment overlays only five UI files; no database migration, policy change or worker change. Encrypted source/database backup and previous image are retained by the release script for rollback.

Additional results: landscape 844×390 and reduced-height 390×360 dialogs fit; entered text survives viewport changes; Escape dismisses the modal. All 11 existing account-workspace/neighborhood-experience/security-hardening regression tests passed. The isolated UI environment has expected 503 responses for unrelated KYC/chat/business services that are not configured there; this run does not claim to validate those integrations.

Production verification at 2026-10-17 05:08 UTC: build UX0DpndTtcJSWXhti0LGi, healthy container, public health HTTP 200, all five deployed source hashes match. Live Chromium verified aligned teaser edges and no page overflow at 320/390/1440px; live search focus outline is none. Screenshot: output/deployment/live-mobile-home-banner.png. Authenticated modal checks were performed in the isolated test environment, not under a customer account in production.
