# RELOO test matrix v1

PASS là lệnh đã chạy cho đúng source, NOT_RUN không chuyển PASS vì có code. Rule identifiers machine-readable `lib/product/rules.json`; test paths are checked in CI.

| Journey / risk | Rule | Test/evidence | State |
|---|---|---|---|
| 4 entries, explicit intent grouping, vi/en | UX-001, UX-002 | superapp browser + unit routing | LOCAL_PASS,16browser checks across foundation |
| Guest auth next / return context | AUTH-001 | auth-navigation, navigation tests + browser | Existing tests; new nav rerun needed |
| Inventory/quote/payment/cancel | STAY-001/002, PAY-001 | stays*.test.mjs + SQL; prior screenshots | Prior local pass, rerun new changes |
| Tenant/role/property | AUTH-001 | stays-management/host tests + existing CRM/security | Local SQL; live API not run |
| iCal stale/conflict/PII | STAY-003 | stays-host.test.mjs | Prior pass |
| Rental regression | RENT-001 | rental-selection/window/neighborhood tests | Prior pass, current rerun planned |
| Sale offer/counter/expire/inventory | SALE-001 | Domain tests required when code lands | NOT_IMPLEMENTED |
| Shift overlap/no-show/full-time | JOB-001 | Domain tests required when code lands | NOT_IMPLEMENTED |
| Staging isolation/access/noindex | ENV-001/002 | environment guard tests + local HTTPHost test | LOCAL_PASS; hosted NOT_RUN |
| Rule/docs/CI consistency | GOV-001 | verify-product-rules script | LOCAL_PASS,17rules; remoteCI NOT_RUN |
| Migration privileges | DATA-001 | security-hardening + stay migration lockdown | Local SQL, production not applied |
| Samsung native / iPhone | UX-003 | research snapshots != RELOO native QA | Reference partial / RELOO new NOT_RUN |
| Capacity2000 / RUMp75 | OPS-001 | workload-specific staging load + device lab | NOT_RUN; not infer from old125VU |
| Legal/provider/real money | LEGAL-001, PAY-001 | legal signoff, official sandbox contract/provider evidence | BLOCKED_EXTERNAL |

No public load/real chat/OTA hold/payment used for acceptance. CI artifacts must include commit/build/migrations/policy digest; screenshot synthetic labels remain visible. Reference screenshots not product assets.

Final foundation run: **53/53 selected unit/SQL/regression PASS**, **16 browser checks PASS**, scoped new-code lint PASS, Next production build PASS. Files: `output/playwright/superapp/{tests.txt,browser.json,build.txt,source-sha256.json,index.html}`. Remote GitHubCI, hosted staging E2E, real PostgreSQL multi-process race, native client QA, paid provider and 2000VU workload remain **NOT_RUN/BLOCKED**. Consent is handled through the actual UI in screenshots; no transaction API success was mocked for these checks.


## UI checkpoint ? 23/10/2026

Xem [RELOO_UI_REDESIGN_20261023.md](RELOO_UI_REDESIGN_20261023.md). Shared design/component refresh ?? tri?n khai local; 54 browser render checks v? 8 interaction checks PASS, 57 selected regression tests PASS. To?n b? 98 route/authenticated/native v?n PARTIAL; kh?ng b?o deployed. Build/lint xem artifact cu?i.

K?t qu? cu?i UI: build retry PASS (c?n advisory Next.js), scoped lint PASS; full lint FAIL 28 errors/63 warnings; final selected tests 76/76 PASS, admin fixture7/7. Xem checkpoint UI ?? bi?t gi?i h?n.
