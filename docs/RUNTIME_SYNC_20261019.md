# Shared runtime synchronization — 19 October 2026

## Observed gap
NativeBridge previously ran the build check only after isNative(). Safari and installed web/PWA sessions did not get that coordinator. This can leave an already-open page using an earlier client bundle after rollout. It is evidence of a version-sync gap, not proof of the user's particular iPhone latency cause.

## Change
RuntimeSync is mounted once through the shared bridge for all clients. It reads the rendered HTML build marker and the no-store runtime endpoint, checks foreground/resume/pageshow/online/route entry and a bounded 30-second interval. Checks are throttled at 15 seconds, time out in eight seconds and skip hidden/offline clients. No service worker is registered and immutable hashed JS/images remain cached.

Only Home/Explore/News can auto-refresh. Visible dialogs, focus in input, visible nonempty input/textarea/contenteditable and recent scrolling/pointer/keyboard activity defer refresh. Booking, checkout, authentication, account, chat and posting routes are not automatically refreshed. An attempt marker preserves the existing 60-second rollout loop guard. Blocked sessionStorage defers rather than risking an uncontrolled loop. Native resume emits the shared event; its duplicate updater is removed. Consent/auth data and preference caches are not cleared.

Existing tabs running the previous code need one normal reload to install the new coordinator; an old already-loaded script cannot be retroactively changed. A sleeping/offline phone cannot update until resumed and online. Equal build does not mean identical hardware/network/rendering performance.

## Validation
Nine navigation/runtime/security regression tests passed; scoped ESLint passed. Actual Windows WebKit (iPhone viewport emulation) tested local fixture homepage/calendar, minute 07 commit and no horizontal overflow/pageerrors. A controlled runtime endpoint test demonstrated unsaved input deferral, one reload after returning to a safe screen and no immediate refresh loop. This is synthetic update evidence, not an iPhone device test. Screenshots/results: output/runtime-sync. No actual iPhone is connected; do not claim iOS device or simulator PASS.

## Release
App-only staged release with encrypted backups and health guard; no DB migration or native binary. After activation synchronize K3s renderers and verify all running build IDs and source hashes. Check production cache headers, HTML build marker and runtime build. Record live evidence separately under output/runtime-sync. Rollback previous image/source and re-sync renderers; never restore DB over ongoing transactions.
