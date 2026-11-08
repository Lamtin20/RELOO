#!/bin/bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo ROOT_REQUIRED; exit 1; }
command -v docker >/dev/null
systemctl is-active --quiet docker
[[ $(uname -m) == x86_64 ]] || { echo UNSUPPORTED_ARCH; exit 1; }
[[ -e /sys/fs/cgroup/cgroup.controllers ]] || { echo CGROUP_V2_REQUIRED; exit 1; }
available=$(df -Pk /mnt/c | awk 'NR==2 {print $4}')
[[ "$available" -ge 20971520 ]] || { echo HOST_DISK_REQUIRES_20_GIB; exit 1; }
memory=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
[[ "$memory" -ge 4194304 ]] || { echo AVAILABLE_MEMORY_REQUIRES_4_GIB; exit 1; }
[[ $(nproc) -ge 4 ]] || { echo FOUR_CPU_REQUIRED; exit 1; }
[[ $(sysctl -n net.ipv4.ip_forward) == 1 ]] || { echo IP_FORWARD_REQUIRED; exit 1; }
tailscale ip -4 | head -n 1 | grep -Eq '^100\.[0-9]+\.[0-9]+\.[0-9]+$'
curl --max-time 5 -fsS http://127.0.0.1:3000/api/health >/dev/null
echo PREFLIGHT_OK
