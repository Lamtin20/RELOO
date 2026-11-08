# Banner indicators — 16/10/2026

MarketplacePromo uses a translucent rounded indicator rail inside the banner. Active indicator: 42×8px white bar; inactive: 8×8px translucent white circles. Controls are real buttons with aria-pressed and labels; pause/resume stays a separate compact control. No generated assets or paid API calls.

Existing scrolling, swipe, 8-second autoplay, hover/focus pause and reduced-motion behavior are retained. Mobile condition text is moved above the controls to prevent overlap. Indicator width transition is disabled for reduced-motion users. Changes are scoped in MarketplacePromo.module.css; old global dot selectors do not affect the new controls.
