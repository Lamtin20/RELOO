#!/bin/bash
set -eu
umask 077
case "${1:-}" in reloo-*.service) unit="$1";; *) unit=unknown;; esac
mkdir -p /srv/reloo/security
printf '%s %s\n' "$(date -u +%FT%TZ)" "$unit" > /srv/reloo/security/last-failure
logger -p daemon.err -t reloo-security "Security or backup unit failed: $unit; inspect systemctl status and journalctl."
