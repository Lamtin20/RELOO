# V4 design system extension

Status: IMPLEMENTED_SHARED_FOUNDATION / PARTIAL_PLATFORM_ADOPTION. Existing `docs/RELOO_DESIGN_SYSTEM.md`, `lib/design/palette.js` and `app/reloo-palette.css` remain intact; this document extends implementation guidance, not business rules.

Direction: editorial hierarchy, readable Vietnamese type, green primary action, restrained surfaces, meaningful density, real product photography. Preserve infinity logo and mascot; mascot belongs in welcome/empty/onboarding moments rather than transaction evidence. Avoid decorative gradients, glow, repeated oversized panels and fabricated metrics. No new brand asset or typography download introduced.

Portable primitives: `lib/design/foundation.js` derives colors from the established palette; spacing4/8/12/16/20/24/32/40/48px, control/panel/sheet radii12/16/20px, motion120/200ms,44px touch target and3px focus. `app/v4-foundation.css` applies primitive variables, localized skip-link treatment, search focus and reduced-motion support. It does not globally rewrite every component's dimensions. Existing font is Be Vietnam Pro via `app/layout.js`; validate font loading before claiming LCP.

Interaction contract: search uses a distinct dialog-linked combobox per instance, nonmodal suggestions, ordinary Tab flow, ArrowDown entry and Escape return/dismissal. No artificial focus trap. Main bypass enters the marketplace main landmark. Product image keeps caller-provided width/height, async decoding, lazy default, stable fallback state and neutral failure label. Information is localized vi/en where changed; user-generated text stays original.

Component states: loading, ready, empty, failed, disabled and focus-visible must be explicit. Error state cannot say a transaction succeeded. Source/property photos are never placeholders for actual inventory. Motion is disabled for affected search/image loading UI under reduced-motion. New data must not be required merely for visual effects.

Acceptance: automated palette contrast checks for normal text/CTA combinations >=4.5:1, primitive parity tests, keyboard/browser fixture checks and before/after review. These checks do not establish WCAG2.2AA for all screens. Native bindings, global token migration, dark-theme computed contrast, all bottom sheets/dialogs and service-specific forms remain PARTIAL/NOT_TESTED.

Axe-driven correction: mobile header search submission uses established primary green/white; unselected discovery intent buttons use established secondary text. Both selectors are scoped in `v4-foundation.css`. Current-source browser artifacts determine observed results; palette arithmetic alone does not prove every computed state.
