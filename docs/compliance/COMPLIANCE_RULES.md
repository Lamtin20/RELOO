# Compliance rule registry

Machine source: `compliance/registry.json`. Version 1, 23/10/2026. 20 requested rules + six product-specific controls. Legal candidates, technical standards and internal policies are distinct. Rule severity is the policy response if a relevant defect is confirmed; it does not prove a legal violation. No rule is silently waived.

| ID | Control | Basis category | Risk | Owner | Method |
|---|---|---|---|---|---|
| RULE-001 | Privacy Policy | LEGAL_REVIEW_REQUIRED | HIGH | Legal/Product | Review published document, effective date, hash/version and links from collection forms |
| RULE-002 | Terms of Service | LEGAL_REVIEW_REQUIRED | HIGH | Legal/Product | Review contract version acceptance journal, disputes and obligations |
| RULE-003 | Cookie Policy | LEGAL_REVIEW_REQUIRED | HIGH | Privacy/Frontend | Inventory actual cookies/storage categories, purposes, processors and settings |
| RULE-004 | Refund and Cancellation Policy | LEGAL_REVIEW_REQUIRED | HIGH | Commerce/Legal | Review per-domain snapshot, deadlines and amount before confirmation |
| RULE-005 | Data Minimization | LEGAL_REVIEW_REQUIRED | HIGH | Privacy/Domain owner | Diff field-purpose inventory; sensitive data requires accountable purpose and retention |
| RULE-006 | Consent Management | LEGAL_REVIEW_REQUIRED | HIGH | Privacy/Frontend | Test unchecked defaults, distinct purposes, evidence and withdrawal |
| RULE-007 | Purpose Transparency | LEGAL_REVIEW_REQUIRED | HIGH | Privacy/Legal | Map notice to actual collection, controller/processor and purpose changes |
| RULE-008 | Data Subject Rights | LEGAL_REVIEW_REQUIRED | HIGH | Privacy/Support | Verify identity, request workflow, deadlines and lawful retention exceptions |
| RULE-009 | Third-party Tracking | LEGAL_REVIEW_REQUIRED | HIGH | Privacy/Security | Observe requests before/after consent and approved destination/transfer inventory |
| RULE-010 | Copyright Assets | INTERNAL_POLICY | MEDIUM | Content/IP | Verify asset hashes against provenance/license permissions; no inference from filename |
| RULE-011 | Authentic Reviews | INTERNAL_POLICY | MEDIUM | Trust and Safety | Verify production feedback origin, demo isolation and anti-spam controls |
| RULE-012 | Marketing Claims | INTERNAL_POLICY | MEDIUM | Content/Legal | Candidate text scan plus substantiation reviewed by content owner |
| RULE-013 | Business Transparency | LEGAL_REVIEW_REQUIRED | HIGH | Operations/Legal | Verify operator/contact and e-commerce model; do not invent license numbers |
| RULE-014 | Image Accessibility | TECHNICAL_STANDARD | MEDIUM | Frontend/QA | Static alt candidates plus rendered accessible-name/decorative review |
| RULE-015 | Color Contrast | TECHNICAL_STANDARD | MEDIUM | Design/QA | Measure computed foreground/background including dark mode; manual image/gradient review |
| RULE-016 | Keyboard Accessibility | TECHNICAL_STANDARD | MEDIUM | Frontend/QA | Keyboard journeys, focus, labels/errors and valid dialog traps |
| RULE-017 | Tracking Configuration Audit | INTERNAL_POLICY | HIGH | Security/Privacy | Compare production scripts/network to registry; sensitive log candidates |
| RULE-018 | Cookie Consent Gate | INTERNAL_POLICY | HIGH | Privacy/QA | Browser fresh/accept/reject/revoke states and mobile/desktop banner |
| RULE-019 | Jurisdiction Check | LEGAL_REVIEW_REQUIRED | HIGH | Legal | Official current source, effective date, transition, territory and responsible counsel |
| RULE-020 | Continuous Compliance | INTERNAL_POLICY | HIGH | Release/Security | Source-bound artifact evidence, periodic checks and release enforcement |
| RELOO-RENTAL | Rental/neighborhood identity, private address/location, deposits and disputes | INTERNAL_POLICY | HIGH | Domain owner + Security + Legal | Existing domain regression tests plus accountable legal/operational review; not implemented is NOT_TESTED until release exclusion is approved |
| RELOO-JOBS | Candidate CV/identity purpose, employer ACL, scam reports and retention | INTERNAL_POLICY | HIGH | Domain owner + Security + Legal | Existing domain regression tests plus accountable legal/operational review; not implemented is NOT_TESTED until release exclusion is approved |
| RELOO-STAYS | Server price/inventory, policy/quote snapshots and authorized images | INTERNAL_POLICY | HIGH | Domain owner + Security + Legal | Existing domain regression tests plus accountable legal/operational review; not implemented is NOT_TESTED until release exclusion is approved |
| RELOO-PAYMENTS | Webhook authenticity, idempotency, no card logs, refunds and reconciliation | INTERNAL_POLICY | HIGH | Domain owner + Security + Legal | Existing domain regression tests plus accountable legal/operational review; not implemented is NOT_TESTED until release exclusion is approved |
| RELOO-TRUST | Evidence quality, appeal/manual review, private allegations/IP data | INTERNAL_POLICY | HIGH | Domain owner + Security + Legal | Existing domain regression tests plus accountable legal/operational review; not implemented is NOT_TESTED until release exclusion is approved |
| RELOO-WORLD | Avatar/profile/chat, minors, UGC and digital assets approval | INTERNAL_POLICY | HIGH | Domain owner + Security + Legal | Existing domain regression tests plus accountable legal/operational review; not implemented is NOT_TESTED until release exclusion is approved |

Every machine record includes scope, reference IDs, severity, method, evidence requirements, remediation, status and accountable team. Scanners produce candidate findings with path/line, confidence (confirmed boolean), reason and remediation; matched credential values are omitted.

PASS means the specified check has valid evidence for that source. NOT_TESTED is not PASS. NEEDS_LEGAL_REVIEW requires counsel. A regex cannot establish privacy necessity, asset rights, legal entity readiness, trustworthy reviews or legal applicability.
