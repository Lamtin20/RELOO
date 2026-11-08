[CmdletBinding()]
param([string]$Distro)
$ErrorActionPreference='Stop'
if (!(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object IPAddress -eq '100.122.200.65')) {
 throw 'Run this script on the RELOO Windows server (Tailscale 100.122.200.65), not the development laptop.'
}
$wslArguments=@()
if($Distro){$wslArguments+=@('-d',$Distro)}
$recovery=@'
set -eu
test -d /srv/reloo/apps/web || { echo 'This WSL distribution is not the RELOO server. Select the correct distribution with -Distro.'; exit 1; }
systemctl start docker ssh tailscaled
docker start reloo_caddy
docker start reloo_cloudflared
docker ps --format '{{.Names}} {{.Status}}'
curl --fail --max-time 15 http://127.0.0.1:3000/api/health
'@
& wsl.exe @wslArguments -u root -- bash -lc $recovery
if($LASTEXITCODE -ne 0){throw 'Recovery did not finish. Keep the output for diagnosis.'}
Write-Host 'Local services started. Check https://reloo.vn after the tunnel reconnects.'
