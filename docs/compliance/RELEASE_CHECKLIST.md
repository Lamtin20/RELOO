# Guardian operation and release checklist

## Before change

Read AGENTS and compliance registry; identify changed module/data/purpose/providers, field/asset changes, affected rule IDs and regression scope. Source scan is bounded, not a replacement for review.

## Commands

```powershell
npm run compliance:scan
npm run test:compliance
npm run compliance:check -- --check=unit
npm run compliance:check -- --check=dependency
npm run compliance:gate
```

Allowlisted check IDs: lint, typecheck, unit, privacy-consent, security, secrets, integration, regression, dependency, dependency-mobile, dependency-tooling, build. Logs and evidence under ignored `output/compliance/`. `privacy-consent` automated evidence is unit/real-loader fixture scope, not browser certification. Browser script is separate. Full lint failures are not suppressed. No axe/ZAP/Gitleaks duplicate installed; existing bounded secret scan reused. Full secret history and full axe accessibility remain NOT_TESTED.

`run.mjs` snapshots source hashes, emits JSON+Markdown and timestamped history. `--gate` exits0 PASS,1 BLOCKED for confirmed CRITICAL/HIGH,2 NEEDS_REVIEW for missing/stale/failed evidence. Reports are technical only. A clean regex scan leaves rules NOT_TESTED, not PASS.

All checks and26 rule/domain decisions require current sourceHash, PASS, timestamp within24hours, artifact path under output/compliance and matching SHA256; future/other-source/unverified evidence rejected. Check runner hashes artifacts itself and verifies source unchanged. Manual evidence requires accountable review content (reviewer/role/date/scope/source/decision/expiry), independently approved through repository/environment controls. A JSON file is not a cryptographic or legal attestation. Never fabricate an approval. A not-applicable module requires an approved applicability record, not silent skipping.

Packaging (`scripts/package-release.mjs`) and Android publishing check Guardian before writing/releasing. Existing production startup is deliberately not gated/restarted/stopped. Other manual deployment tools, direct server edits, GitHub required status checks and protected environments require operator enforcement; local code cannot prove those controls active. No release was attempted.

CI runs on PR/push/weekly and saves artifacts. It currently fails closed pending evidence; this is expected, not a reason to waive rules. Schedule audits dependencies/source only; production network/config observation still needs explicit authorized URL/config and maintained browser evidence. Do not claim the weekly job scans live production.

Optional local hooks are versioned in `.githooks`; install explicitly with `git config core.hooksPath .githooks`. Existing hook configuration must not be overwritten silently. Hooks are bypassable; branch protection/protected release environment must enforce Guardian independently.

Before deploy: full audit + production build + isolated staging + same web/backend/native runtime/catalog + owner legal/asset/provider approvals. MEDIUM needs ticket/owner/plan; LOW tracked. Uncertain legal conclusions NEEDS_LEGAL_REVIEW. Binding legal policies are not auto-edited. Resolve dependency advisories through compatible updates and regressions, not `audit fix --force`.

## Dashboard

`/admin/compliance`, guarded admin API `/api/admin/compliance`, read-only/no-store. Reads the latest local/CI report only; no evidence file means unavailable, never green. Deploy reports through restricted read-only artifact delivery; do not publish private reports under public/. No progress percentage asserts legal compliance. Local timestamped report history is not a durable multi-instance audit database; CI retention30days requires owner retention/export policy.

Source identity excludes ignored output/build/dependency/native generated paths, env/key files, files over2MB and generated COMPLIANCE_AUDIT_REPORT.md. Reports disclose bounded coverage; private key/env/history scanning requires a separately authorized scanner. Source snapshots are not all-byte deployment attestations. Risk triage is required evidence; source triage is retained in compliance/triage.json and never auto-suppresses a changed file.


## Continuation and dependency remediation ? 23/10/2026

Next.js/eslint-config-next patched16.4.2; compatible lockfile updates applied; solc kept0.8.28 with tmp0.2.7 override to avoid changing deployed compiler artifacts. Never rebuild/redeploy an evidence contract merely to silence a dependency scan. Remaining5high development-package records share braces<=3.0.3, whose latest npm version at the recorded check is3.0.3; no force downgrade or unreviewed waiver. Production-only dependency audit is separate from all-dependency gate, not a replacement.

`npm run compliance:inventory` produces field/public-asset candidate records with source/asset hashes. Existing human metadata is preserved only on matching identity. CI checks inventory drift.548 JSX field candidates and310 public assets are not approved legal bases or licenses. See APPROVALS_REQUIRED.md for concrete responsibility. `npm run test:all` runs all *.test.mjs; warnings from vendored optional Ganache native extensions can fall back to JS without asserting native acceptance.

Query context and ephemeral UI state do not grant permissions. Location sharing now waits for explicit current-location action instead of requesting GPS on sheet open. No new background tracking, SDK, price, contract or DB schema was introduced. Full lint excludes generated Android/iOS build outputs and vendored Emscripten wasm glue, not application source; application findings are repaired rather than hidden.


## Isolated EVM test-tool reproducibility and scope

The full suite includes tests/evm-contract.test.mjs, which uses Ganache7.9.2 from ignored output/verification. `tools/verification/package.json` and lock now pin that already-used tool so fresh CI can reproduce the slot with npm ci --ignore-scripts before the all-test run. The test tool is separate from app/runtime dependencies and is not added to the production release archive. No duplicate runtime provider or deployed contract/compiler change is introduced.

Guardian now requires a separate dependency-tooling audit. The pinned tool audit reports33package advisory records (5critical/22high/5moderate/1low); automatic compatible lock-only fix cannot repair the bundled Ganache dependencies. These are not production advisory counts or evidence of a deployed exploit. Do not silently exclude the test tool or call all dependencies clean. Security must review an upstream patch, maintained replacement with equivalent real EVM assertions, or an accountable isolated-tool risk decision consistent with policy; this agent has not waived it.

Local hooks were installed for this checkout after verifying no existing core.hooksPath; source hooks remain bypassable and do not replace required remote checks/protected release environments. Remote CI has not been run or branch protection activated.

Dependency audit scopes are now application root, mobile package and isolated EVM tooling, each required independently. High/critical advisory records block by internal policy; moderate/low records are review/remediation items rather than automatically failing the technical audit. Network/format/command failures are NOT_TESTED. Current mobile audit reports3moderate CLI/xcode/uuid records, no high/critical; track them with Native/QA. This scope split is not an exemption for dev tools and no risk acceptance is invented.


## Remediation superseding the old Ganache advisory backlog ? 23/10/2026

The isolated EVM toolchain now uses EthereumJS VM10.1.3, not Ganache. Install with npm ci --ignore-scripts --prefix tools/verification. Tests import the pinned tools/verification directory and execute signed transactions against unchanged deployment bytecode. Never restore the old output/verification dependency as an implicit CI requirement. Audit tooling independently. Mobile uuid11.1.1 override retains xcode CJS v4 usage; run verify-ios-source and actual Xcode workflow before native release.

Manual evidence must be JSON schemaVersion1, checkId, sourceHash, decision APPROVED, reviewer.name/role, scope, nonempty evidence references, reviewedAt and expiresAt. Missing/malformed/pending/expired reviews fail closed. Identity/authority of reviewers requires protected repository/environment approval; JSON format is not a signature. Do not self-approve legal, asset or operator obligations.
