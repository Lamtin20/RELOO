# V4 QA report

Status: BOUNDED_FOUNDATION_QA / ECOSYSTEM_NOT_COMPLETE. Result artifacts under `output/v4/` are local evidence, not production or native certification.

## Baseline

Playwright CLI observed actual local home/explore/register pages at390/768/1440 widths, explicit anonymous/empty catalog fixtures. Nine baseline screenshots retained;9/9 no horizontal overflow, each page had one main landmark. Initial run did not open suggestion panels and therefore did not itself reproduce duplicate-ID behavior; that finding is from fixed-ID source and multi-instance design. The dedicated development QA preview tests multiple instances explicitly.

Historical pre-V4 source had524/524 regression PASS and12 automated Guardian PASS; that source hash is not this V4 source. Do not reuse historical PASS as current evidence. New token contrast/parity/locale tests and changed shared-component/browser checks have dedicated current artifacts. Report exact commands/counts from `output/v4/verification-summary.json` after execution; no count/score is presumed here.

## Coverage and controls

New tests cover palette text/CTA contrast, portable/web primitive parity and locale key completeness. Browser fixture acceptance covers search-panel linkage, Escape/focus, broken/cached images, layout hints, missing IntersectionObserver, bypass navigation and responsive screenshots. Local generated QA imagery is a browser fixture, not website inventory or a licensed product/property asset. The existing dev-only preview remains excluded from production by `notFound()`.

Full screen-reader/WCAG audit, all critical commerce/account/provider journeys, cross-browser matrix, real Android/iOS, production-mode CWV/performance/load, remote CI execution, chaos/restore and staged runtime synchronization remain NOT_TESTED unless a separately linked current artifact proves them. No completion is inferred from a screenshot or component unit test. Device emulation is layout evidence only.

The existing axe-core4.12.1 transitive development dependency is used for bounded WCAG-tag scans on3 mobile pages. It initially found4 serious contrast nodes on Explore; scoped palette-token corrections were implemented and final results must be read from the retained browser result. Automated zero violations, if observed, does not resolve axe incomplete checks or certify fullAA. Earlier failing attempts (image synchronization, navigation timeout, hydration readiness) are retained separately rather than represented as passes. Final isolated browser run uses synthetic Supabase public config and no service-role/secret key in its process, with mocked browser API responses; it does not mutate real business data.

Final bounded browser result:9/9 responsive cases without horizontal overflow;9 interaction/image/localization assertions passed; axe reported0 violations on home/explore/register after fixing4 Explore labels and the registration method divider. Incomplete checks remain: home93 contrast nodes; Explore5 contrast nodes; register4 contrast nodes ; the missing password-description target was fixed and no longer appears in the final axe incomplete list. These are unresolved manual-review items, not automatically waived. Android offline debug compilation succeeded; ADB found0 connected devices, so native journey/performance/accessibility is NOT_TESTED. No iOS build or store acceptance is inferred.

Reproduction: `node --test tests/v4-foundation.test.mjs` and the scoped regression listed in verification summary; ESLint/TypeScript; `node scripts/verify-v4-standard.mjs`; development-only `output/v4/after-browser.js` via Playwright CLI. Guardian scan/tests/gate remain mandatory. No source/secret/production mutation is allowed just to obtain a green check.

Versioned browser helper: `scripts/v4-browser-qa.mjs` exports the page-based CLI routine; emit its function text to the ignored runner and pass `--filename` to Playwright CLI. Provision the tiny WebP fixture under `output/v4/qa-image.webp`, keep the server on loopback4317 and the documented synthetic backend configuration, and retain the helper's returned JSON. This routine never submits commerce forms. The whole suite is PARTIAL if provider/session mocks are removed or required tools are unavailable. CI adds primitive/report contracts only; a remote browser/native run is not implied by that CI definition.
