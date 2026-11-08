# RELOO visual refresh — 18 October 2026

## Scope and identity

Replace owned marketing artwork, campaign banners, category illustration icons and rental-benefit illustrations. Do not fabricate replacement photographs for real sellers' listings, user avatars, identity documents, source evidence or news event photographs. Preserve RELOO wordmark and approved RELOOP character. Small navigation/action icons continue to use the existing vector library for clarity and accessibility.

The user explicitly selected the Vibi API fallback. The built-in image tool remains unavailable; actual generation used the ImageGen bundled CLI with requested model gpt-image-2 and Vibi base URL https://vibi.top/v1. The public provider pricing catalog advertised image-generation; a real first request returned an inspected image before the remaining bounded batch. Provider-internal model routing is not independently attested. No claim of a newly installed native ChatGPT tool is made.

## Prompt set

Every output: high visual clarity at its actual UI size, no embedded text/logos/watermarks, restrained natural green brand accents, no invented discount/partner/insurance claim. Text is rendered as accessible localized HTML. Each campaign must have different composition, scene, viewpoint and color balance; do not repeat the same cluster of floating products.

| Asset | Prompt direction |
| --- | --- |
| Rental campaign | Premium editorial lifestyle still life: camera, carefully packed camping kit on a sunlit wooden bench beside an open doorway, warm morning outdoor light, tactile fabric and metal. Clear objects, generous left negative space for HTML headline; panoramic 2:1, mobile crop centered on products. No people or invented product logos. |
| Buy/sell campaign | Contemporary Vietnamese apartment corner, well-kept chair, reading lamp and folded denim arranged as a real handover-ready collection, deep teal wall, directional afternoon light. Distinct architectural composition, ample negative space, no floating objects or money. Panoramic 2:1. |
| Partner-shopping campaign | Refined studio editorial of a reusable shopping tote, everyday headphones and skincare containers without labels, apricot background, natural soft shadows and asymmetrical diagonal composition. No cashback percentage, currency or coins; panoramic 2:1. |
| Nearby discovery | Friendly residential courtyard, close-up of a drill kit and compact folding table ready for neighbor handover, soft foliage, pale blue and mint accents. Do not imply a real named development or official management partnership. |
| Category icons (14 distinct) | One coherent studio object-illustration family, one recognizable subject per icon, three-quarter view with generous padding, clean pale neutral background, soft realistic material/shadow. Subjects: headphones, camera, kettle, tent, stroller, handbag, bicycle, dumbbells, drill, printer, guitar, hairdryer, party speaker, reusable storage box. No tiny labels, fake logos, arbitrary extra props. Square, legible at 56–80px. Separate images, not a sprite sheet with tiny unreadable panels. |
| Six rental benefits | Six distinct scenes: equipment beside a modest savings jar (no asserted monetary savings), calendar beside packed bag, person-free camera test setup, uncluttered shelf with one borrowed item, neatly curated diverse kit, carefully repaired item passed between two anonymous hands. Visual topics correspond to existing copy; do not invent facts or quantified environmental claims. |

If RELOOP is part of a generated scene, use the approved reference as identity-preserving input. Keep the head loops, leaf, face, teal body, blue modules, gloves, boots and chest identity unchanged. Do not generate a replacement mascot from a text-only description.

## Integration and QA

Generate source assets to ignored output, inspect each image, then use `scripts/import-web-image.mjs` to create versioned WebP derivatives in public/images. Keep existing assets for rollback. Record prompts, tool/model and source provenance without secrets. Validate mobile crops, desktop text contrast, loading and reduced motion. No GIF/video loading download is required.

## Mascot loading implementation

Shared `components/mascot/MascotLoader.tsx` uses the approved master raster at modest dimensions; this is whole-character transform animation, not an articulated 3D character rig. A perspective reuse trail, parcel loop, soft ground shadow and floating movement communicate ongoing work. Compact buttons retain a small mascot and status label. Success/error only follow the caller's actual state. Only finite caller-supplied progress is shown; after 15 seconds a truthful slow-connection hint appears. Reduced motion removes animations. Both existing loader interfaces delegate to this implementation.

Real-browser preview at 320/390/768/1440px showed no horizontal overflow. Verified live transform changes, no progressbar without measured input, a supplied 42% value, success/error stopping perpetual motion, retry availability, and all animations disabled under prefers-reduced-motion. No page runtime exceptions were observed. Screenshots are in `output/visual-refresh/`; this is a component-state test, not a real payment or transaction test. Scoped lint and the production web build passed.

## Deployment evidence

Loading was deployed with encrypted source/database backups and prior-image rollback tag. Build `JTC73tR0Ikq8Fs1Rrl4ey` was verified on the Docker backend and both Kubernetes renderer pods. Seven release files matched local SHA-256 values and the new static asset returned HTTP 200. See `output/visual-refresh/release-verification.json` and `renderer-verification.json`.

The actual public loading UI was inspected by delaying only the browser's own read-only marketplace bootstrap request. At 320/390/1440px the mascot loaded, no horizontal overflow appeared, reduced motion stopped animation, and loading ended after the real response was released. No customer record, order or payment was written. First attempt preceded renderer synchronization and was not counted as a passing check; the post-rollout browser check passed.

## Generated artwork completion

24 distinct source images were generated: 4 campaigns, 14 category illustrations and 6 rental-benefit images. One pilot plus 23 batch jobs, concurrency 2, outer max-attempts 1; no silent model downgrade. All outputs were visually reviewed on labeled contact sheets. The existing RELOOP master remains unchanged in loading; no fabricated seller/product or identity images were substituted.

27 versioned WebP derivatives (three extra mobile crops) were imported through scripts/import-web-image.mjs into public/images/refresh-20261018, totaling 1,639,854 bytes. Source images/prompts stay under ignored output/visual-refresh. Full prompts and requested model are recorded in output/visual-refresh/prompt-manifest.json; source/derivative hashes, dimensions and sizes in import-manifest.json and public provenance.json. The prompt directions above are the final prompt set's brief; no API credential is stored in manifests or public bundles.

MarketplacePromo, shared categoryArtwork consumers (including category sheet/browser), RentalBenefits and the nearby discovery banner now use these assets. Existing originals remain available for rollback. User-managed CRM banner campaigns are preserved; public home slots were checked and none was active at rollout preparation. scripts/invoke-imagegen.ps1 accepts validated size/quality for future explicit image jobs, still using the same encrypted key and bundled CLI.

Local real-browser checks covered three slides at 320/390/768/1440, all image decodes, no horizontal overflow, six benefit images and nearby banner. Screenshots were visually inspected; the first desktop capture preceded the responsive image decode, so a decode-complete capture was used for final visual QA. Scoped lint and web production build passed. No new paid schedule or news-worker configuration was enabled. This is a finite authorized artwork task, not a claim of free/unlimited image generation.

### Artwork production release

Build `kjdFgUoaWHYHn8SPyd86F` was verified on the Docker backend and both Kubernetes renderer pods. All 36 packaged files matched local hashes; the matching JavaScript asset and all 27 WebP image URLs returned HTTP 200. Public browser checks at 390/1440px verified three new campaign slides, category references, all six benefit images and nearby artwork with no horizontal overflow or page runtime exceptions. Captures: `output/visual-refresh/production-home-*.png`, `production-nearby-390.png`; evidence: `art-release-verification.json`, `art-renderer-verification.json`. No customer listing, order or payment was changed. Rollback keeps original image paths and prior source/image backups.
