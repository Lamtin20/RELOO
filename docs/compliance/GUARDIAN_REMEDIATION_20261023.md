# Guardian remediation ? 23/10/2026

Status: implementation checks in progress; release not authorized by this document.

## Source changes

- Replaced deprecated Ganache7.9.2 and its bundled vulnerable dependency tree with pinned EthereumJS VM/common/tx/util10.1.3 in the isolated test toolchain. The real EVM test executes the unchanged EvidenceAnchor deployment bytecode with signed writer/attacker transactions, verifies stored digests and rejects another wallet, overwrite, skipped sequence and wrong previous digest. No chain deployment, compiler change or mock replacement.
- Mobile xcode dependency uses uuid11.1.1 override (CJS API retained). Existing pbxproj structural validation passes. Actual Xcode compilation/native release remains separate.
- Root npm audit currently returns0advisory records although braces version remains3.0.3. Historical audit remains in ignored output/compliance. Registry coverage changes are not described as a source patch or proof of zero vulnerability.
- Historical schema migration now revokes profile update columns from public/anon/authenticated, matching backend-only baseline. No production SQL applied. Lockdown regression retained.
- Removed unsubstantiated anti-fraud certainty and number1 wording from seed content; no binding contract or fee policy changed.
- Manual rule/legal/asset/risk evidence now requires structured source-bound review content, accountable name/role, scope/references, approval decision and valid time range. Plain PASS logs cannot satisfy manual reviews. This is format validation, not identity authentication or a cryptographic legal signature. GitHub/environment approval controls still need operator setup.

## Verification strategy

Run all current-source checks without further edits while executing; old hashes are never relabeled current. Run separate root/mobile/tool audits and whole test suite, lint/typecheck/build, source secrets/security and consent. Fault injection must still block. Runtime browser and staging evidence remain independently required; pure tests cannot certify hosted UAT.

## Remaining real-world conditions

Field purpose and asset rights need actual reviewed records. Entity/legal model/current full law and partner/payment rules need accountable approval. Structured templates cannot invent those facts. UAT host is now accessible but complete schema/backend/egress/DNS/TLS/provider and native acceptance remain to be deployed and tested. No production rollout is implied by a clean dependency audit.

Final executed results will be appended to COMPLIANCE_AUDIT_REPORT.md and output/compliance/readiness-remediated.json after the stable-source run.
