<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## RELOO Compliance Guardian

Before changes, read `docs/compliance/RELEASE_CHECKLIST.md` and `compliance/registry.json`; record affected modules, data/purposes/providers and rule IDs. New fields/assets need purpose/provenance review. After changes run relevant lint, typecheck, unit/integration/regression, security, consent and UI accessibility checks; retain evidence and mark unavailable checks NOT_TESTED. Run `npm run compliance:scan` and `npm run test:compliance`. Before any new release run `npm run compliance:gate` with current source-bound evidence; never bypass a blocker merely to pass. Legal uncertainty is NEEDS_LEGAL_REVIEW, not a legal violation or compliance certificate. Do not auto-edit binding policies, stop existing production, or invent approvals. See `docs/compliance/COMPLIANCE_RULES.md`.

## Release consistency

Every deployment must synchronize the RELOO website and app's shared runtime. Verify the backend and all web renderers use the same build, then check desktop, iPhone and Android clients against the runtime endpoint and the same public catalog. Native clients currently load `https://reloo.vn`; native code/config changes additionally require the corresponding app release. Do not report a local-only fix as deployed or assume an offline/already-open client has refreshed.

## Public image imports

New website raster content must use WebP derivatives. Use `node scripts/import-web-image.mjs <source> <destination.webp>` for project assets; use the existing WebP media pipeline for uploads/imports. Keep original design references and browser-required favicon/icon formats. See `docs/WEBP_IMAGE_IMPORTS.md`. Do not reintroduce JPEG/PNG fallback storage for product uploads.

## Security baseline

Public-schema data/RPC access is backend-only. Do not grant PUBLIC/anon/authenticated table, column, sequence or RPC privileges in public. Apply `deploy/vietnam/security-lockdown.sql` after schema changes and run `tests/security-hardening.test.mjs`. Keep website Auth cookies HttpOnly; browser code must not read access/refresh tokens. Preserve nonce CSP, origin checks, Tailscale-only management access, read-only/capability-restricted containers and encrypted backup timers. See `docs/SECURITY_HARDENING_20261015.md` before deployment.

## REA-assisted reference implementation

REA is installed as a development tool, with its upstream checkout at `../.tooling/rea`; the pinned runtime is recorded in `tools/rea-toolchain.json`. See `docs/REA_WORKFLOW.md`.

For a supplied website/app reference, shipped bundle, or behavior not established by source, use the installed `reverse-engineer-anything` skill and REA's supported evidence tools before reconstructing the relevant feature in RELOO. Ordinary repository architecture/code edits still use normal source tools; do not run REA diagnostics for every change. Use the existing RELOO stack, design system, auth and APIs. Distinguish observed behavior, static findings and inference; retain evidence under ignored `output/rea/`. Validate the implementation in desktop/mobile browsers and run relevant checks. REA evidence is input to implementation, not automatic authorization to replace architecture, change prices, install providers or deploy. Do not silently update the pinned toolchain or upstream checkout.

## RELOO Real V4 quality

For Real web, Android/iOS and Mini App changes, read the bounded audit and platform matrix in `docs/v4/`. Use `docs/RELOO_PRODUCT_SPEC.md` only as the owner-authorized temporary business reference; do not edit, rename or replace existing specifications without an approved reviewable proposal. V4 reports and `RELOO_V4_SSOT_PROPOSAL.md` are evidence/proposals, not competing business specifications or approvals.

Keep World/UE5/game systems untouched. Record platform/data/provider impact and acceptance criteria before implementation. Reuse the existing palette, image pipeline, auth and transactional boundaries. Run `node scripts/verify-v4-standard.mjs` and relevant tests/browser checks; its PASS covers foundation contracts only. Browser emulation never establishes native acceptance, and source presence never establishes a working provider, live transaction or measured capacity. Preserve genuine image condition/provenance, explicit permission/consent and truthful unavailable/error states. Keep unresolved performance, security, accessibility, business and legal items visible; do not invent scores, expert reviews or release approvals.

