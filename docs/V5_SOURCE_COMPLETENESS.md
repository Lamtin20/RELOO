# V5 source completeness and production deployment

The original d234079 Git tree referenced runtime components that were absent from Git. This change records the existing RELOO Real runtime, API modules, public assets, mobile wrapper source, tests and deployment configuration already present in the workspace. It also records the existing dependency lock and excludes generated test builds and accidental Windows cache paths.

Scope: Real web/backend and existing native wrapper source; World/UE5 is untouched. No new provider, database migration, policy approval or native store publication is authorized by this source synchronization. Data/purposes/providers retain the existing implementation; current review requirements apply across RULE-001..020 and the six domain controls. Candidate provenance/field metadata are not legal or IP approval.

The owner authorized supplementing GitHub main and deploying it, and previously explicitly authorized the temporary NEEDS_REVIEW release exception in this conversation. The exception does not convert missing reviews to PASS and does not remove the release gate. Current check evidence and deployment results are retained in ignored output/deployment and output/compliance.

Deployment uses a dedicated checkout of GitHub main, a production Docker build (npm run build), the existing live service configuration, encrypted backups, rollback image and post-release Docker/Kubernetes build consistency checks. Runtime credentials remain on the server and outside Git. Existing authenticated transaction/native device acceptance is not established by guest HTTP/browser checks.
