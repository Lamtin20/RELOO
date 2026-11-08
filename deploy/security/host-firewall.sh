#!/bin/bash
set -euo pipefail
for tool in iptables ip6tables; do
 command -v "$tool" >/dev/null || continue
 "$tool" -w -N RELOO-HOST-IN 2>/dev/null || true
 "$tool" -w -F RELOO-HOST-IN
 "$tool" -w -A RELOO-HOST-IN -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
 "$tool" -w -A RELOO-HOST-IN -i lo -j RETURN
 "$tool" -w -A RELOO-HOST-IN -i tailscale0 -j RETURN
 "$tool" -w -A RELOO-HOST-IN -p tcp -m multiport --dports 22,80,443,3000,3001,8080,8082,8888 -j DROP
 "$tool" -w -A RELOO-HOST-IN -j RETURN
 "$tool" -w -C INPUT -j RELOO-HOST-IN 2>/dev/null || "$tool" -w -I INPUT 1 -j RELOO-HOST-IN
 if "$tool" -w -S DOCKER-USER >/dev/null 2>&1; then
  "$tool" -w -N RELOO-DOCKER-IN 2>/dev/null || true
  "$tool" -w -F RELOO-DOCKER-IN
  "$tool" -w -A RELOO-DOCKER-IN -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  "$tool" -w -A RELOO-DOCKER-IN -i tailscale0 -j RETURN
  "$tool" -w -A RELOO-DOCKER-IN -i docker0 -j RETURN
  "$tool" -w -A RELOO-DOCKER-IN -i br+ -j RETURN
  for port in 80 443 3000 3001 8080 8082 8888; do
   "$tool" -w -A RELOO-DOCKER-IN -p tcp -m conntrack --ctorigdstport "$port" -j DROP
  done
  "$tool" -w -A RELOO-DOCKER-IN -j RETURN
  "$tool" -w -C DOCKER-USER -j RELOO-DOCKER-IN 2>/dev/null || "$tool" -w -I DOCKER-USER 1 -j RELOO-DOCKER-IN
 fi
done
