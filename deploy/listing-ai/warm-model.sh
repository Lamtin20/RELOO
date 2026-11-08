#!/bin/bash
set -euo pipefail
profile_model="${RELOO_LOCAL_MODEL:-qwen3.5:4b}"
case "$profile_model" in
  qwen3.5:4b) ;;
  qwen3.8:27b) test "${RELOO_QWEN38_READY:-0}" = 1 ;;
  *) echo "Unsupported local model profile" >&2; exit 1 ;;
esac
/bin/ollama serve &
server_pid=$!
cleanup() { kill -TERM "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
for warm_attempt in $(seq 1 60); do
  if /bin/ollama list >/dev/null 2>&1; then break; fi
  kill -0 "$server_pid"
  sleep 1
done
# Fail closed when weights were not provisioned; do not download at runtime.
/bin/ollama show "$profile_model" >/dev/null
OLLAMA_NOHISTORY=1 /bin/ollama run "$profile_model" --think=false --format=json --keepalive=-1m 'Respond only with {"ready":true}' >/dev/null
echo "Local model warmed; no customer data used."
wait "$server_pid"
