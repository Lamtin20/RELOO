#!/bin/bash
set -Eeuo pipefail
# Only this dedicated chain is rebuilt. Never flush Docker/Tailscale/global rules.
for tool in iptables ip6tables; do
 "$tool" -w 5 -N RELOO-K3S-IN 2>/dev/null || true
 "$tool" -w 5 -F RELOO-K3S-IN
 "$tool" -w 5 -A RELOO-K3S-IN -i lo -j RETURN
 "$tool" -w 5 -A RELOO-K3S-IN -i tailscale0 -j RETURN
 if [[ "$tool" == iptables ]]; then
  "$tool" -w 5 -A RELOO-K3S-IN -s 10.42.0.0/16 -j RETURN
  "$tool" -w 5 -A RELOO-K3S-IN -s 172.16.0.0/12 -j RETURN
 fi
 "$tool" -w 5 -A RELOO-K3S-IN -p tcp -m multiport --dports 6443,10250,2379,2380,31080 -j DROP
 "$tool" -w 5 -A RELOO-K3S-IN -p udp --dport 8472 -j DROP
 "$tool" -w 5 -A RELOO-K3S-IN -j RETURN
 "$tool" -w 5 -C INPUT -j RELOO-K3S-IN 2>/dev/null || "$tool" -w 5 -I INPUT 1 -j RELOO-K3S-IN
done
