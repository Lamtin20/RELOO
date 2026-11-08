# RELOO free map stack — verified source and setup

Owner direction 7 November 2026: use free software/data only, no paid API subscriptions. This supersedes the managed-tile preference in the initial map request. All runtime targets below are private self-hosted services; no public OSM/Nominatim/Photon/OSRM demo server is used as production infrastructure. CPU, RAM, disks and bandwidth still consume existing infrastructure. No new paid account, key or provider was activated.

## Selected repositories and real result

- Martin: https://github.com/maplibre/martin — serves MBTiles/PMTiles and fonts, Apache-2.0/MIT. Official documentation: https://maplibre.org/martin/ .
- tilemaker: https://github.com/systemed/tilemaker — regional OSM PBF to OpenMapTiles-compatible MBTiles, upstream FTWPL plus bundled dependency/data notices. Offline build only.
- Photon: https://github.com/komoot/photon — Apache-2.0, local OpenSearch geocoding/reverse lookup. Version 1.3.0 artifact SHA256 checked against GitHub release metadata.
- OSRM: https://github.com/Project-OSRM/osrm-backend — BSD-2-Clause routing. Regional driving profile only; do not claim walking/live traffic until a separately built/supported profile exists.

Pinned public image digests, observed repository revisions and artifact/data URLs: `tools/free-map-toolchain.json`. Container tag names were verified against registries; runtime pulls/builds and image vulnerability scans are NOT_TESTED, not inferred from metadata. Source HEAD is not asserted to equal an older published image build revision.

Photon official README documents country extracts: https://download1.graphhopper.com/public/asia/vietnam/index.html . The selected release dump is 71,156,888 bytes compressed, ODbL/OpenStreetMap contributors, compatible with Photon 0.7.x–1.x according to the publisher page. HTTPS download was checked against publisher MD5 and locally pinned SHA256; this is provenance/checksum evidence, not a cryptographic signature or independent license approval.

Actual local verification: imported **469,294 Vietnamese place documents** into a fresh isolated index in **75 seconds**. JVM capped at 1,536MB heap and two processors, using already-installed Java 21. No system Java/Docker installation. Decompressed dump was 1,404,203,445 bytes; index/storage needs are separate from compressed size. Never size storage from the 71MB download alone.

Real local queries through the self-hosted adapter transport: Ho Chi Minh 413ms (first/cold query), Ha Noi 32ms, Da Nang 24ms, reverse query at a known public city-centre coordinate 107ms; each returned three results. These four samples are not a latency percentile or search-accuracy benchmark. The first Da Nang result was the airport, demonstrating that candidates still require user choice. No user GPS/contact/account data was used. Evidence: `output/verification/free-maps-research/photon-live-results.json`, local import/server logs under ignored `output/free-maps/photon/`.

## Integration without paid APIs

Private GPS/entrance selection now has a separate confirmed-coordinate control: below-20m device-reported GPS gate, searchable/correctable pin, saved default reuse, optional private WebP entrance photo and conditional 3D route preview. This does not increase upstream POI count or establish real-world sub-20m accuracy. See [PRECISE_LOCATION_IMPLEMENTATION.md](PRECISE_LOCATION_IMPLEMENTATION.md); production and device acceptance remain pending.

The existing SDK uses logical URLs under `https://maps.reloo.internal`. `lib/maps/self-hosted.js` dispatches them to fixed Docker aliases only:

| Logical resource | Internal target |
|---|---|
| `/style.json` | Original RELOO OpenMapTiles style in `lib/maps/free-style.json` |
| `/tiles/z/x/y.pbf` | `map-tiles:3000/vietnam/z/x/y` |
| `/fonts/stack/range.pbf` | Martin font glyph endpoint |
| `/geocode`, `/reverse` | `map-geocoder:2322/api/` or `/reverse` |
| `/route/v1/driving/...` | `map-router:5000` |

No user-selected host/port is fetched. Resource, geocoder and router purposes are separated; resource requests cannot become unlimited geocoder requests. URLs with credentials, bad tile/font ranges, unknown origins/paths or redirects fail closed. Same-origin app APIs keep server config out of browser keys and preserve CSP. `RELOO_MAP_MODE=self-hosted` requires both explicit provider approval and successful readiness flag before maps appear active. Merely preparing files does not set either flag.

## Reproducible preparation

1. Run `node scripts/prepare-free-map-artifacts.mjs` on the build machine. This downloads/verifies the Photon JAR and country dump into ignored output; it starts no service and preserves existing files. Python `zstandard` can stream-decompress the verified dump into a fresh source file. Do not unpack over a running index.
2. Obtain the Vietnam PBF directly from https://download.geofabrik.de/asia/vietnam-latest.osm.pbf and verify its publisher checksum and timestamp. Preserve a manifest/SHA256 of that exact snapshot. No PBF/coastline import has been run by this implementation.
3. In a dedicated `RELOO_MAP_DATA_DIR`, prepare `source/`, `tiles/`, `routing/`, `geocoder/`, `fonts/` and scratch space. Keep `photon-1.3.0.jar` at the root. The Photon country index requires files writable by UID1000. Install licensed Noto Sans font files under `fonts/`, retain their SIL OFL notices; original style expects `Noto Sans Regular` and supports Vietnamese glyphs.
4. Tilemaker's pinned OpenMapTiles config also requires its declared coastline/landcover shape inputs. Download those from the upstream documented OSM/Natural Earth sources, preserve licenses and checksums, and provide their exact expected paths. Do not silently omit the inputs and claim complete coast/land coverage. Choose this schema explicitly; tilemaker master defaults may differ.
5. On an isolated Docker build host, use `deploy/maps/compose.build.yml` profile `build-data`, one job at a time, with no network access. Tilemaker and OSRM consume substantial RAM/storage. Build-route expects a separate PBF at `routing/vietnam.osm.pbf`; it does not overwrite an existing graph. Never run the build profile against production storage or under production load. Offline import profiles are prepared but not runtime-verified here because Docker is unavailable on the workstation.
6. After image audits and data acceptance, start `deploy/maps/compose.free.yml` only in reviewed staging. It pins images by digest, publishes no host ports, restricts capabilities/resources and uses an internal network. Add the backend to `reloo-map-private` while preserving its existing networks; do not replace Docker/K3s/Auth/OCR networks. Only prepared regional data is mounted; no startup downloads/imports.
7. Apply values from `deploy/maps/free.env.example` to the reviewed backend environment. Run `node scripts/free-map-preflight.mjs` inside that private backend network. It checks a tile/font/forward/reverse/route read without changing config. Confirm real coverage and directions; sample availability alone is not quality/load acceptance.
8. Only after staging acceptance and current-source release gate PASS set readiness/provider configuration for the reviewed release. Synchronize all renderers/backend and test desktop/iPhone/Android. No production services or databases were changed to enable this stack.

## Remaining free-stack prerequisites

Weekly automatic Photon refresh is implemented in `deploy/maps/photon_weekly_update.py` with a Monday 00:00 Vietnam systemd timer, checksum comparison, isolated index build, A/B validation/switch and rollback. See [PHOTON_WEEKLY_UPDATES.md](PHOTON_WEEKLY_UPDATES.md) for bootstrap, status, activation and failure handling. **Prepared, not enabled on production**; the 469,294-place local import alone does not activate this schedule. Only Photon data is refreshed; tiles/routing graphs are separate artifacts.

Real vector tile archive, coastline/landcover inputs, Noto font files, driving graph and Docker image vulnerability/runtime validation remain pending. Photon local index works, but has not been transferred to production or connected as an always-on production service. Private-network staging with the complete tile/geocoder/router stack remains NOT_TESTED. Existing legal/provider/asset review and unsupported stays/jobs transactional integrations remain blockers even when service fees are zero.

Do not use unrestricted public demo servers as an emergency substitute. On failure disable readiness and retain list/manual entry; exact private addresses stay protected. Update data by building a new version and atomically switching the reviewed mount, never importing into the live index. Roll back matching artifacts/config and keep business data unchanged. No promise of unlimited free third-party capacity, 100% coverage or live traffic is made.
