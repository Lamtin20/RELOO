# V4 performance report

Status: BASELINE_LAB_ONLY / TARGETS_NOT_ACCEPTED. No web p75, backend concurrency or native performance target is claimed.

## Conditions and observed baseline

Workstation Windows, Next development server/webpack on loopback4317, Chromium via Playwright CLI, empty catalog and anonymous fixtures, no4G shaping/CPU throttling. Screenshot runs include first compilation and warm reloads. Dev navigation durations are not LCP/INP and cannot fairly compare cold before to warm after.

| Page | Desktop1440 navigation ms | Tablet768 navigation ms | Mobile390 navigation ms |
|---|---:|---:|---:|
| Home |18564|15391|2965|
| Explore |23638|1557|1364|
| Register |4472|3850|1619|

Measured fact: no horizontal overflow in those nine baseline cases. Artifact: `output/v4/baseline-browser.log`; timings are raw Navigation Timing, not industry CWV. After-run raw measurements are retained separately; no performance improvement percentage is inferred from differing cache/compiler states.

Follow-up runs wait for DOMContentLoaded rather than completed external-resource loading and finally use a synthetic/no-service-key backend environment to isolate UI tests. A raw navigation duration0 at that point means load timing is incomplete, not0ms readiness. Do not compare these after values with completed-load baseline values or claim the change improved LCP. Local development navigation timeouts are retained in failed-attempt logs; a restarted owned development process is not a production recovery drill.

## Targets and missing evidence

Web LCP<=2.5s, INP<=200ms, CLS<=0.1 atp75: NOT_TESTED. Need production-mode controlled runs with matched cache/network/CPU plus appropriate field distribution and privacy-approved telemetry. Shared image dimensions/async decoding are implemented capabilities, not measured CLS/LCP improvements. No fabricated srcset/CDN capacity claim.

Native cold/warm startup, frame pacing, crashes/ANR, memory, battery/network: NOT_TESTED. Proposed measurement must specify actual supported device/OS, sample count and workload; targets require Mobile/QA acceptance rather than invented numbers. Backend endpoint p50/p95/p99, DB query/resource profiles,100/500/2000-user tests and autoscaling thresholds: NOT_TESTED. Do not load-test production/shared infrastructure. Use isolated approved staging and document saturation/error rates as well as successful latency.

Risk: existing bootstrap/client filtering can bound visible cards without proving server pagination/scalability. CSS/provider composition can affect readiness. Profile before migrating architecture. Monitoring currently has source/operational history but no new independently verified production telemetry acceptance in this run.
