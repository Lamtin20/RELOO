# RELOO Assurance Upgrade

Date: 2026-10-10 (Asia/Saigon).

- [x] Inspect existing OCR, identity, profile, CRM and risk paths; locate real KYC failure.
- [x] Confirm VNPT API/SDK contracts from the owner's authenticated documentation.
- [x] Inspect Twenty/public-apis licenses and clone reference repositories.
- [ ] Configure private VNPT credentials and implement authoritative OCR/face/card checks.
- [ ] Implement fresh live-video challenge capture and server validation; do not trust browser success flags.
- [x] Rebuild profile/address/bank settings; registered phone immutable; bank ownership remains self-declared.
- [x] Background risk screening, warning-only safety UI and separate email-exposure results.
- [x] CRM entity/integration configuration and automatic entity metadata propagation.
- [ ] CRM Vietnamese labels, tasks/opportunities, API discovery catalog and optional Twenty adapter.
- [x] Versioned legal documents and compliance matrix using current official sources.
- [ ] Double-entry accounting, SePay reconciliation/VA/invoice adapters with explicit readiness gates.
- [ ] Signed immutable rental history, tamper rules and EVM hash-only anchoring adapter/contract.
- [x] Improve lender workspace and add transaction/dispute evidence guidance to chat.
- [ ] Isolated rule tests, genuine provider verification, desktop/mobile QA and homelab deployment.

Owner decisions:

- Legal entity is declared later in CRM and must propagate automatically.
- VNPT eKYC credentials supplied privately; never include them in source or browser bundles.
- Bank account data is entered by the user; no bank holder lookup is requested.
- SePay is selected for identified bank collection/virtual accounts; token/webhook credentials still needed.
- EVM is selected; RPC/signing wallet will be provided later. Internal signed history is not a blockchain anchor.
- A virtual account routes money to the main bank account; it does not establish legal escrow by itself.

Verification limits: local similarity is not identity probability; only authoritative provider checks may enable automated identity clearance. Financial adapters may not post or issue money/tax results from simulated responses. Legal drafts are not a statement that registrations, licences or regulator filing have been completed.

Implementation checkpoint:

- Added profile sections, searchable current province/ward picker, bank logos/search and encrypted declarations. Isolated database tests verify immutable registered phone, holder-name mismatch, staff permissions and atomic KYC queue/challenge consumption.
- Added VNPT server adapter, OCR/face/card confidence gates, own-profile OCR confirmation, video capture and private server pose/identity/presentation-attack checks. Native SDK links are configured separately; the Web flow uses APIs and the VNPT Web experience as reference.
- Customer safety responses now omit source diagnostics/admin review links; only positive risk matches expose the direct lookup link.
- Added CRM business/entity/integration settings and dynamic footer entity metadata. No fictitious company name or hotline remains in the footer.
- Generated public-apis directory snapshot with 2,037 entries and MIT notice; CRM search/filter UI added. Added native tasks/opportunities modules.
- Added signed journal and EVM contract/adapter with hash-only data and immutable ordered stream anchors. RPC/wallet/contract are not yet provided, so nothing is recorded on-chain.
- Initial rule, schema and journal tests pass (16 targeted checks). Desktop/mobile QA and full deployment are still pending.
- Real VNPT request from homelab fails `401 / IDG-00000401`. Token/project/key match the logged-in portal; expiry is 2026-10-11 06:29:53 UTC. No identity has been automatically cleared from this failed provider call.
- KYC image built successfully. MediaPipe/DeepFace imports and an actual generated WebM blank-video rejection passed. Production app/worker/browser/kyc/edge have been updated; app health is OK.
- Official legal sources downloaded under `output/legal-sources`. Verified: NĐ 356/2025 Article 42 repeals NĐ 13/2023 from 2026-01-01. NĐ 248/2026 Article 52 replaces NĐ 52/2013 + 85/2021 from 2026-07-01, with Article 53 transition exceptions. Law 122/2025 Article 41 transition through 2027-06-30 applies only to qualifying prior registrations; RELOO registration has not been supplied.
