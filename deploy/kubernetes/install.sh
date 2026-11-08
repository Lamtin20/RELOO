#!/bin/bash
set -Eeuo pipefail
umask 077
cd "$(dirname "$0")"
bash ./preflight.sh
[[ ! -e /etc/rancher/k3s/config.yaml ]] || { echo EXISTING_K3S_REQUIRES_REVIEW; exit 1; }
NODE_ADDRESS=$(tailscale ip -4 | head -n 1)
[[ -f ./k3s && -f ./upstream-install.sh && -f ./toolchain.json ]]
python3 - <<'PY'
import hashlib,json
from pathlib import Path
lock=json.loads(Path('toolchain.json').read_text())
for p,key in [('k3s','binarySha256'),('upstream-install.sh','installerSha256')]:
 assert hashlib.sha256(Path(p).read_bytes()).hexdigest()==lock[key], 'HASH_MISMATCH'
PY
VERSION=$(python3 -c "import json;print(json.load(open('toolchain.json'))['version'])")
install -d -m 700 /etc/rancher/k3s /srv/reloo/backups/kubernetes-install
iptables-save > /srv/reloo/backups/kubernetes-install/iptables-before.rules
ip6tables-save > /srv/reloo/backups/kubernetes-install/ip6tables-before.rules
install -d -m 700 /var/lib/reloo-k3s
cat > /var/lib/reloo-k3s/install-rollback.sh <<'ROLLBACK'
#!/bin/bash
if [[ ! -e /var/lib/reloo-k3s/install-approved ]]; then
 systemctl stop k3s || true
 if [[ -x /usr/local/bin/k3s-killall.sh ]]; then /usr/local/bin/k3s-killall.sh; fi
 iptables-restore < /srv/reloo/backups/kubernetes-install/iptables-before.rules
 ip6tables-restore < /srv/reloo/backups/kubernetes-install/ip6tables-before.rules
fi
ROLLBACK
chmod 700 /var/lib/reloo-k3s/install-rollback.sh
systemd-run --unit=reloo-k3s-install-rollback --on-active=10m /bin/bash /var/lib/reloo-k3s/install-rollback.sh
cat > /etc/rancher/k3s/config.yaml <<EOF
docker: false
node-name: reloo-homelab-01
node-ip: ${NODE_ADDRESS}
advertise-address: ${NODE_ADDRESS}
bind-address: ${NODE_ADDRESS}
tls-san:
 - ${NODE_ADDRESS}
write-kubeconfig-mode: "0600"
secrets-encryption: true
flannel-iface: tailscale0
disable:
 - traefik
 - servicelb
 - local-storage
kube-proxy-arg:
 - nodeport-addresses=${NODE_ADDRESS}/32
kubelet-arg:
 - address=${NODE_ADDRESS}
 - system-reserved=cpu=1500m,memory=6Gi
 - kube-reserved=cpu=500m,memory=512Mi
 - container-log-max-size=10Mi
 - container-log-max-files=3
 - pod-max-pids=256
 - image-gc-high-threshold=85
 - image-gc-low-threshold=80
EOF
chmod 600 /etc/rancher/k3s/config.yaml
install -m 755 ./k3s /usr/local/bin/k3s
INSTALL_K3S_SKIP_DOWNLOAD=true INSTALL_K3S_SKIP_START=true INSTALL_K3S_VERSION="$VERSION" sh ./upstream-install.sh
systemctl enable --now k3s
export RELOO_KUBE_SERVER="https://${NODE_ADDRESS}:6443"
timeout 180 bash -c 'until k3s kubectl --server="$RELOO_KUBE_SERVER" get --raw=/readyz >/dev/null 2>&1; do sleep 3; done'
timeout 180 bash -c 'until k3s kubectl --server="$RELOO_KUBE_SERVER" get node reloo-homelab-01 >/dev/null 2>&1; do sleep 3; done'
k3s kubectl --server="$RELOO_KUBE_SERVER" wait --for=condition=Ready node/reloo-homelab-01 --timeout=180s
k3s kubectl --server="$RELOO_KUBE_SERVER" label node reloo-homelab-01 reloo.vn/renderer-enabled=true --overwrite
k3s kubectl --server="$RELOO_KUBE_SERVER" rollout status deployment/coredns -n kube-system --timeout=180s
k3s kubectl --server="$RELOO_KUBE_SERVER" rollout status deployment/metrics-server -n kube-system --timeout=180s
curl --max-time 8 -fsS https://reloo.vn/api/health
touch /var/lib/reloo-k3s/install-approved
systemctl stop reloo-k3s-install-rollback.timer
echo K3S_INSTALLED_NO_TRAFFIC_SWITCH
