#!/bin/sh
# Read-only host readiness. Run on the intended UAT Linux host; no production edits.
set -eu
test "$(uname -s)" = Linux || { echo 'BLOCKED: Linux Docker host required'; exit 1; }
command -v docker >/dev/null || { echo 'BLOCKED: Docker Engine required'; exit 1; }
docker compose version
docker info --format '{{.OSType}}' | grep -qx linux
command -v node >/dev/null || { echo 'BLOCKED: Node22+ required for config/test tooling'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
command -v openssl >/dev/null || { echo 'BLOCKED: openssl required'; exit 1; }
for port in 4524 4525 4526 8026; do
 if ss -ltnH | awk '{print $4}' | grep -Eq ":${port}$"; then echo "BLOCKED: requested UAT port $port is already in use"; exit 1; fi
done
test ! -e /srv/reloo-staging/secrets/staging.env || { echo 'REVIEW: UAT config already exists; preserve and inspect resource identity before changes'; exit 2; }
df -h /srv
free -m
echo 'HOST_PREFLIGHT_READY: not backend/schema/release acceptance'
