# Footer & mobile clarity — 18 October 2026

## Scope
- Reuse existing marketplace, shared calendar, quote/inquiry APIs and locale provider. No schema, pricing, authentication, consent or payment changes.
- Verified DMCA remains per-public-page through the existing certificate and badge endpoint. Its stable location is now the brand column immediately below the RELOO logo. `footer-trust` is the shared layout slot for future verified labels; no Ministry of Industry and Trade or security certification has been fabricated or displayed without a real registration.
- Removed the old mobile `:has(.dmca-badge)` rule that hid the entire footer brand/links. Mobile now displays the company identity and two compact policy/support columns, with clearance for fixed bottom navigation/actions.
- Footer headings, support links, DMCA accessible name and request teaser use vi-VN/en-US. Category names retain the existing catalog content.
- Explore: separate full-width sorting from location/filter controls; GPS icon no longer overlays location/sort text. Remove repeated explanatory prose.
- Product: remove repeated rate/location/review explanations and duplicate mobile booking CTA. Keep one fixed primary rental action, actual amounts and owner-confirmation status. Important transaction explanation is available in a disclosure, and detailed costs/terms remain in server-quoted review.
- Rental request and language settings: concise headings/fields without repeated setup paragraphs. Nearby homepage promos: heading and action instead of explanatory paragraphs.
- Location sheet: Escape/Android Back handling, scroll lock, focus containment/restoration, dynamic viewport height and minimum 44px header controls. Returning to a suspended filter preserves the draft.

## Reference evidence
REA Android capture: `output/rea/mioto-footer-mobile/reference/` (ignored). Observed Mioto home presents compact location/time fields and one primary action; text describes fields rather than explaining implementation. Prior calendar reference evidence remains `output/rea/mioto-calendar-20261018/`. RELOO keeps its own brand and transaction rules; Mioto artwork is not copied.

## Validation
- 24 existing calendar, rental selection, rental details, language and security tests passed (`output/mobile-footer/tests.txt`).
- Browser fixture flow passed: fallback image, HH:mm date range, quoted breakdown, filter/date carry, nested calendar Escape, widths 320/390/768/1440 without horizontal overflow (`flows.txt`). Fixtures are synthetic; no request/message/payment was sent.
- Additional layout, location keyboard, production build and deployed checks are recorded in `output/mobile-footer/`. Only checks with actual output count as verified.
- Browser viewport checks do not establish real iOS Safari/device certification. Existing listings 009/012 still lack original photos; this change does not replace them with invented product imagery.

## Release and rollback
Use the existing staged Docker build/encrypted backup release process. No migration. Sync both Kubernetes renderers only after backend health succeeds; verify exact build IDs and source hashes. Roll back to the saved image/source if health fails, without restoring the database over live transactions.
