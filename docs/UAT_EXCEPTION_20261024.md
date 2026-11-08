# Restricted UAT exception — 24 October 2026

The owner explicitly authorized staging deployment while temporarily deferring accessibility evidence, hosted UAT/runtime acceptance and legal/asset/data-purpose approval dossiers. This changes the release decision for private UAT only. It does not approve a binding policy, establish asset rights, certify compliance or authorize a production release.

Policy: compliance/uat-exception-20261024.json. Review window ends 31 October 2026 at 23:59:59 Vietnam time. Production packaging/publishing continues to use the original Guardian gate. All 12 automated technical checks must pass for the current source. Confirmed CRITICAL/HIGH findings cannot be waived by the staging packager. Missing evidence stays NEEDS_REVIEW/NOT_TESTED.

Runtime is restricted by Basic access, noindex, dedicated resources and synthetic data. No live provider credentials, payments, email/SMS or background workers are enabled. No customer rows or production sessions are cloned. The installed mobile app continues using production; a separate native test build or browser is needed to inspect UAT. Expired UAT access must fail closed while existing production remains operational.

Package with node scripts/package-staging-uat.mjs after refreshing evidence. Store package/source/image identifiers and actual deployment/browser probes in output/uat. Never run the production packager with a bypass flag or mark deferred evidence PASS.
