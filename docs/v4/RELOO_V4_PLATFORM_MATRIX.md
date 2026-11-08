# V4 platform coverage matrix

Legend: SOURCE=implementation found; PARTIAL=bounded local verification only; BLOCKED=dependency/approval missing; NOT_TESTED=no current platform evidence. None implies app-store delivery.

| Capability | Responsive web | Android | iOS | Cross-platform dependency |
|---|---|---|---|---|
| Shared authentication/profile | SOURCE/PARTIAL | Native project + remote web; device NOT_TESTED | Swift/project + remote web; simulator/device NOT_TESTED | Real auth/OTP/provider session and legal acceptance |
| Search/discovery | Foundation changes +390/768/1440 lab checks | Shared runtime code; native focus/keyboard NOT_TESTED | Shared runtime code; safe-area/VoiceOver NOT_TESTED | Genuine public inventory, query preservation |
| Listing + Visual AI | SOURCE/PARTIAL | Camera bridge source; hardware NOT_TESTED | Camera usage declarations; hardware NOT_TESTED | Configured permitted research provider; user reviews before publish |
| Rentals/secondhand | SOURCE/PARTIAL | Native transaction E2E NOT_TESTED | Native transaction E2E NOT_TESTED | Identity, server quote, payment/state/contract acceptance |
| Accommodation | PREVIEW/sandbox; BLOCKED live acceptance | Same readiness, not a native live booking pass | Same readiness, not a native live booking pass | Authorized inventory, host policies, provider/payment/legal |
| Jobs | COMING_SOON; BLOCKED | BLOCKED | BLOCKED | Worker/employer workflows and accepted business model |
| Live Map/private pin | SOURCE/PARTIAL | GPS permission/accuracy NOT_TESTED | GPS permission/accuracy NOT_TESTED | Real tiles/Photon/OSRM staging and privacy acceptance |
| Neighborhood | SOURCE/PARTIAL | Device/membership E2E NOT_TESTED | Device/membership E2E NOT_TESTED | Authorized membership/public projection |
| Messaging/notifications | SOURCE/PARTIAL | Lifecycle/push/deep-link NOT_TESTED | Lifecycle/push/deep-link NOT_TESTED | Participant authorization; no broad private-location exposure |
| Payments/refunds/contracts | Source integrity controls found | Real money/device NOT_TESTED | Real money/device NOT_TESTED | Provider sandbox, idempotency and owner/legal approvals |
| Support/disputes/orders | SOURCE/PARTIAL | End-to-end NOT_TESTED | End-to-end NOT_TESTED | Real states, authority, retention and appeals |
| Offline/error | Existing web/native fallback source | Resume/ANR/poor network NOT_TESTED | Resume/memory/poor network NOT_TESTED | No fabricated availability or automatic payment replay |

Verified project evidence: `mobile/capacitor.config.json`, Android manifest/build.gradle/MainActivity, iOS AppDelegate/SceneDelegate/Info.plist, actual Xcode project and `.github/workflows/ios-simulator.yml`. Windows PATH did not expose native tools; further inspection found the existing Android SDK/JDK in `output/mobile-tools/tools.json`. Offline Gradle `assembleDebug` reported BUILD SUCCESSFUL; this verifies the existing wrapper compiles, not that it displays the new undeployed V4 web runtime. ADB inventory found0 connected devices. No installation/publication, release signing or native source/config change occurred. iOS compilation and remote CI remain NOT_TESTED; no local Xcode/macOS facility was found.

User-journey inventory: registration/login; verification/profile; discovery; search/filter; nearby; listing; photo suggestions; rental/agreement; secondhand; negotiation/chat; payment/refund; e-contract; service booking; jobs; reminders; order tracking; disputes/support. Existing source is not acceptance of every item. Full V4 platform acceptance remains BLOCKED until designated critical journeys are evidenced on supported platforms.
