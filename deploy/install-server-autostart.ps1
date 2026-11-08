[CmdletBinding()]
param([string]$Distro='Ubuntu')
$ErrorActionPreference='Stop'
if (!(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object IPAddress -eq '100.122.200.65')) {
 throw 'Run on the RELOO Windows server (100.122.200.65). No changes were made.'
}
$taskDirectory=Join-Path $env:LOCALAPPDATA 'RELOO-Server'
New-Item -ItemType Directory -Path $taskDirectory -Force | Out-Null
$linux=@'
set -eu
test -d /srv/reloo/apps/web || { echo 'RELOO application directory not found in this distribution'; exit 1; }
systemctl enable --now docker ssh tailscaled
for name in reloo-vn-db-1 reloo-vn-auth-1 reloo-vn-rest-1 reloo-vn-storage-1 reloo-vn-gateway-1 reloo_caddy reloo-web-app-1 reloo-web-edge-1 reloo-web-worker-1 reloo_cloudflared; do
 if docker container inspect "$name" >/dev/null 2>&1; then
  docker update --restart unless-stopped "$name" >/dev/null
  docker start "$name" >/dev/null
 fi
done
echo 'RELOO services started. Keeping WSL active.'
while sleep 60; do :; done
'@
$encodedLinux=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($linux.Replace("`r",'')))
$launcher=Join-Path $taskDirectory 'keepalive.ps1'
$distroLiteral=$Distro.Replace("'","''")
$content=@"
`$ErrorActionPreference='Stop'
& wsl.exe -d '$distroLiteral' -u root -- bash -lc 'echo $encodedLinux | base64 -d | bash'
exit `$LASTEXITCODE
"@
[IO.File]::WriteAllText($launcher,$content,[Text.UTF8Encoding]::new($false))
$windowsUser=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$launcher+'"')
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $windowsUser
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$principal=New-ScheduledTaskPrincipal -UserId $windowsUser -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'RELOO-WSL-Web' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Start the existing RELOO Ubuntu services and keep WSL active after Windows sign-in.' -Force | Out-Null
Start-ScheduledTask -TaskName 'RELOO-WSL-Web'
Write-Host 'Installed RELOO-WSL-Web for this Windows account. No password was stored. Keep this account signed in; after a reboot sign in to start WSL.'
Get-ScheduledTask -TaskName 'RELOO-WSL-Web' | Select-Object TaskName,State
