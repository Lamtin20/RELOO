#!/bin/bash
set -u
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
[[ $(id -u) == 0 ]] || exit 1
[[ -d /srv/reloo/apps/web ]] || exit 1
state_dir=${RELOO_RECOVERY_STATE_DIR:-/var/lib/reloo-recovery}
mkdir -p "$state_dir"
chmod 700 "$state_dir"
exec 9>"$state_dir/check.lock"
flock -n 9 || exit 0
[[ ! -f "$state_dir/maintenance" ]] || exit 0
log(){ logger -t reloo-recovery -- "$*"; }
get_state(){ local value; value=$(cat "$state_dir/$1" 2>/dev/null || true); [[ $value =~ ^[0-9]+$ ]] && printf '%s' "$value" || printf '0'; }
set_state(){ printf '%s\n' "$2" > "$state_dir/$1"; }
now=$(date +%s)
for service in docker ssh tailscaled; do
 if ! systemctl is-active --quiet "$service"; then
  log "Starting inactive service: $service"
  timeout 45 systemctl start "$service" || log "Service start failed: $service"
 fi
done
timeout 15 docker info >/dev/null 2>&1 || { log 'Docker unavailable; no daemon or WSL force-restart attempted'; exit 1; }
# Preserve the installed containers, images, credentials, firewall and network setup.
containers=(reloo-vn-db-1 reloo-vn-auth-1 reloo-vn-rest-1 reloo-vn-storage-1 reloo-vn-gateway-1 reloo_caddy reloo-web-app-1 reloo-web-edge-1 reloo-web-worker-1 reloo_cloudflared)
for container in "${containers[@]}"; do
 running=$(timeout 10 docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null) || continue
 if [[ $running != true ]]; then
  last=$(get_state "start-$container")
  if (( now-last >= 180 )); then
   set_state "start-$container" "$now"
   log "Starting stopped container: $container"
   timeout 45 docker start "$container" >/dev/null 2>&1 || log "Container start failed: $container"
  fi
 fi
done
local_ok=false
body=$(curl --silent --show-error --fail --max-time 8 http://127.0.0.1:3000/api/health 2>/dev/null) || body=''
if printf '%s' "$body" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("service")=="reloo" and d.get("status")=="ok" else 1)' 2>/dev/null; then local_ok=true; fi
if [[ $local_ok == true ]]; then
 set_state app-failures 0
else
 failures=$(get_state app-failures); set_state app-failures "$((failures+1))"
 last=$(get_state app-restart)
 if (( failures+1 >= 3 && now-last >= 600 )); then
  set_state app-restart "$now";set_state app-failures 0
  log 'Local health failed for three checks; restarting only the existing web app'
  timeout 60 docker restart --time 30 reloo-web-app-1 >/dev/null 2>&1 || log 'Web app restart failed'
 fi
 log 'Local application health unavailable'
 exit 1
fi
# A public network timeout is not evidence that the connector should be restarted.
public_file=$(mktemp "$state_dir/public.XXXXXX")
public_code=$(curl --silent --max-time 12 --output "$public_file" --write-out '%{http_code}' https://reloo.vn/api/health 2>/dev/null) || public_code=000
if [[ $public_code == 530 ]] && grep -q '1033' "$public_file"; then
 failures=$(get_state tunnel-failures);set_state tunnel-failures "$((failures+1))"
 last=$(get_state tunnel-restart)
 if (( failures+1 >= 3 && now-last >= 600 )); then
  set_state tunnel-restart "$now";set_state tunnel-failures 0
  log 'Origin healthy but Cloudflare 1033 persists; restarting only the existing connector'
  timeout 45 docker restart --time 20 reloo_cloudflared >/dev/null 2>&1 || log 'Cloudflare connector restart failed'
 fi
elif [[ $public_code == 200 ]]; then
 set_state tunnel-failures 0
 set_state last-healthy "$now"
else
 log "Public health indeterminate (HTTP $public_code); preserving the running connector"
fi
rm -f -- "$public_file"
