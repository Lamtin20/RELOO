# Mobile header and native fullscreen — 24 October 2026

Scope: shared mobile header, native-only bottom navigation, mini-app web navigation, weather display and native viewport. Guardian RULE-007, RULE-009, RULE-014, RULE-015, RULE-016, RULE-020. No new data collection, tracker, provider, location request or legal-policy publication. Weather reuses the existing server endpoint and explicitly labels the existing Ho Chi Minh City forecast; missing forecasts do not create temperature values.

Bottom navigation now requires Capacitor, rather than a mobile viewport. Guest app navigation includes News instead of authenticated transaction/publishing shortcuts. Signed-in users retain their transaction tools and access News beside the notification bell in the home header. Mobile browsers access News in the header; mini-app web navigation moves to normal flow near the top. Web does not reserve the removed bottom-navigation space.

The home header has a logo/actions row and a compact weather row. Background responds to Vietnam morning/day/night and the returned weather condition. No continuous animation, background GPS or fabricated forecast. Reduced-motion disables the color transition. Interactive buttons retain 44px targets.

Native routes request the existing immersive implementation on all routes, rather than only Shorts. This hides OS bars with transient swipe access; cutout/safe-area CSS remains for controls. Header background reaches the top edge without an extra rounded white cap. iOS contentInset changes from automatic to never to let viewport-fit=cover and CSS own the inset once; this requires native config synchronization and an iOS build, not only a web deployment.

Connected Samsung SM-N950N: Android 9. The active WebView provider is Chrome 138.0.7204.179, confirmed through dumpsys webviewupdate. The installed inactive Android System WebView 79 is not the active provider. Native fullscreen/camera/keyboard/rotation on the changed runtime remains NOT_TESTED: the installed app loads production, while these changes are local. iOS build/real-device testing is NOT_TESTED on Windows.

Evidence: output/header-browser.log, output/header-native-browser.log and output/playwright/header-20261024. Browser runs use synthetic auth and weather fixtures; native detection is simulated with Capacitor's custom platform and does not certify OS bar behavior. Unit/regression, typecheck, lint, Guardian and build logs are under output/header-*.log. No deployment or native release is claimed.
