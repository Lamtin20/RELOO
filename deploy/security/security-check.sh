#!/bin/bash
set -euo pipefail
umask 077
mkdir -p /srv/reloo/security
permissions=$(docker exec reloo-vn-db-1 psql -U postgres -d postgres -Atc "select has_column_privilege('authenticated','public.profiles','role','UPDATE') or has_column_privilege('authenticated','public.profiles','activation_status','UPDATE') or has_function_privilege('anon','public.reloo_record_screening(text,text,jsonb,text)','EXECUTE') or has_table_privilege('anon','public.security_audit','TRUNCATE')")
test "$permissions" = f || { echo 'SECURITY_CHECK_FAILED: public database grants reopened'; exit 1; }
headers=$(curl --fail --silent --show-error --max-time 20 --head http://127.0.0.1:3000 -H 'Host: reloo.vn')
for header in content-security-policy x-content-type-options x-frame-options strict-transport-security; do
 printf '%s\n' "$headers" | grep -iq "^$header:" || { echo "SECURITY_CHECK_FAILED: missing $header"; exit 1; }
done
curl -4 --fail --silent --show-error --retry 1 --retry-delay 2 --max-time 20 https://reloo.vn/api/health >/dev/null
test -f /srv/reloo/backups/automatic/last-success
age=$(( $(date +%s) - $(stat -c %Y /srv/reloo/backups/automatic/last-success) ))
test "$age" -lt 32400 || { echo 'SECURITY_CHECK_FAILED: backup older than nine hours'; exit 1; }
date -u +%FT%TZ > /srv/reloo/security/last-success
echo 'SECURITY_CHECK_OK'
