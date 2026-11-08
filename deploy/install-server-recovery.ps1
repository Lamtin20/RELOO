[CmdletBinding()]
param([string]$Distro='Ubuntu',[switch]$StartAtBoot,[switch]$UseS4U,[pscredential]$Credential,[switch]$PreventSleepOnAC)
$ErrorActionPreference='Stop'
if(!(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object IPAddress -eq '100.122.200.65')){throw 'Run on the RELOO Windows server, not the development computer.'}
if($Distro -notmatch '^[A-Za-z0-9_. -]{1,80}$'){throw 'Invalid distribution name.'}
$serverUser=[Security.Principal.WindowsIdentity]::GetCurrent().Name
if($serverUser -notmatch '\\KENT$'){throw 'Run as the Windows KENT account that owns the RELOO Ubuntu distribution.'}
if($UseS4U -and !$StartAtBoot){throw 'UseS4U requires StartAtBoot.'}
if($StartAtBoot -and !([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Run an elevated PowerShell under KENT to register a boot task.'}
if($StartAtBoot -and !$UseS4U -and !$Credential){$Credential=Get-Credential -UserName $serverUser -Message 'Windows stores this credential securely for the RELOO startup task.'}
if($StartAtBoot -and !$UseS4U -and (!$Credential -or $Credential.UserName -ne $serverUser -or $Credential.Password.Length -eq 0)){throw 'The password boot task requires the existing WSL owner and a nonempty Windows password. S4U is a separate supported option.'}
$serverDirectory=Join-Path $env:LOCALAPPDATA 'RELOO-Server'
New-Item -ItemType Directory -Path $serverDirectory -Force|Out-Null
$backupDirectory=Join-Path $serverDirectory ('backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backupDirectory -Force|Out-Null
foreach($taskName in @('RELOO-WSL-Web','RELOO-WSL-Watchdog')){if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){Export-ScheduledTask -TaskName $taskName|Set-Content -LiteralPath (Join-Path $backupDirectory ($taskName+'.xml')) -Encoding UTF8}}
foreach($fileName in @('keepalive.ps1','watchdog.ps1')){if(Test-Path -LiteralPath (Join-Path $serverDirectory $fileName)){Copy-Item -LiteralPath (Join-Path $serverDirectory $fileName) -Destination (Join-Path $backupDirectory $fileName)}}
$health=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'reloo-healthcheck.sh')).Replace("`r",'')
$service=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'reloo-healthcheck.service')).Replace("`r",'')
$timer=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'reloo-healthcheck.timer')).Replace("`r",'')
$keepalive=@'
#!/bin/bash
set -eu
test -d /srv/reloo/apps/web || exit 10
exec 9>/run/lock/reloo-keepalive.lock
flock 9
systemctl start docker ssh tailscaled
systemctl start reloo-healthcheck.timer
while :; do sleep 60; done
'@
$encode={param($text)[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text.Replace("`r",'')))}
$linux=@"
set -eu
test -d /srv/reloo/apps/web
for required in docker curl python3 flock logger timeout; do command -v "`$required" >/dev/null || { echo "Missing tool: `$required"; exit 11; }; done
mkdir -p /var/lib/reloo-recovery /usr/local/sbin
chmod 700 /var/lib/reloo-recovery
backup=/var/lib/reloo-recovery/backup-`$(date +%Y%m%d-%H%M%S)
mkdir -p "`$backup"
for file in /usr/local/sbin/reloo-healthcheck /usr/local/sbin/reloo-keepalive /etc/systemd/system/reloo-healthcheck.service /etc/systemd/system/reloo-healthcheck.timer; do
 if test -f "`$file"; then cp -p "`$file" "`$backup/"; fi
done
printf %s '$(& $encode $health)' | base64 -d > /usr/local/sbin/reloo-healthcheck
printf %s '$(& $encode $keepalive)' | base64 -d > /usr/local/sbin/reloo-keepalive
printf %s '$(& $encode $service)' | base64 -d > /etc/systemd/system/reloo-healthcheck.service
printf %s '$(& $encode $timer)' | base64 -d > /etc/systemd/system/reloo-healthcheck.timer
chmod 750 /usr/local/sbin/reloo-healthcheck /usr/local/sbin/reloo-keepalive
systemctl daemon-reload
systemctl enable --now docker ssh tailscaled reloo-healthcheck.timer
for container in reloo-vn-db-1 reloo-vn-auth-1 reloo-vn-rest-1 reloo-vn-storage-1 reloo-vn-gateway-1 reloo_caddy reloo-web-app-1 reloo-web-edge-1 reloo-web-worker-1 reloo_cloudflared; do
 if docker inspect "`$container" >/dev/null 2>&1; then docker update --restart unless-stopped "`$container" >/dev/null; fi
done
/usr/local/sbin/reloo-healthcheck || true
"@
$encodedLinux=& $encode $linux
& wsl.exe -d $Distro -u root -- bash -lc "echo $encodedLinux | base64 -d | bash"
if($LASTEXITCODE -ne 0){throw 'Linux recovery setup failed; Windows tasks were not replaced.'}
$distroLiteral=$Distro.Replace("'","''")
$launcher=@'
$ErrorActionPreference='Stop'
$directory=$PSScriptRoot
$log=Join-Path $directory 'keepalive.log'
while($true){
 if(Test-Path -LiteralPath (Join-Path $directory 'maintenance.flag')){Start-Sleep -Seconds 30;continue}
 try {
  if((Test-Path -LiteralPath $log) -and (Get-Item -LiteralPath $log).Length -gt 2097152){Move-Item -LiteralPath $log -Destination ($log+'.previous') -Force}
  Add-Content -LiteralPath $log -Value ((Get-Date -Format o)+' starting Ubuntu services')
  & wsl.exe -d '__DISTRO__' -u root -- /usr/local/sbin/reloo-keepalive *>> $log
  Add-Content -LiteralPath $log -Value ((Get-Date -Format o)+' WSL command exited: '+$LASTEXITCODE)
 }catch{Add-Content -LiteralPath $log -Value ((Get-Date -Format o)+' WSL launch failed')}
 Start-Sleep -Seconds 15
}
'@
$watchdog=@'
$ErrorActionPreference='Stop'
if(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'maintenance.flag')){exit 0}
$task=Get-ScheduledTask -TaskName 'RELOO-WSL-Web'
if($task.State -ne 'Running'){Start-ScheduledTask -TaskName 'RELOO-WSL-Web';Add-Content -LiteralPath (Join-Path $PSScriptRoot 'watchdog.log') -Value ((Get-Date -Format o)+' restarted RELOO-WSL-Web')}
'@
$launcherPath=Join-Path $serverDirectory 'keepalive.ps1'
$watchdogPath=Join-Path $serverDirectory 'watchdog.ps1'
[IO.File]::WriteAllText($launcherPath,$launcher.Replace('__DISTRO__',$distroLiteral),[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($watchdogPath,$watchdog,[Text.UTF8Encoding]::new($false))
$actionFor={param($path)New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$path+'"')}
$mainSettings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$watchSettings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -StartWhenAvailable -MultipleInstances IgnoreNew
$mainTriggers=@(New-ScheduledTaskTrigger -AtLogOn -User $serverUser)
$watchTriggers=@(
 New-ScheduledTaskTrigger -AtLogOn -User $serverUser
 New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 2)
)
if($StartAtBoot){$mainTriggers+=New-ScheduledTaskTrigger -AtStartup}
if($StartAtBoot -and $UseS4U){
 $principal=New-ScheduledTaskPrincipal -UserId $serverUser -LogonType S4U -RunLevel Highest
 Register-ScheduledTask -TaskName 'RELOO-WSL-Web' -Action (& $actionFor $launcherPath) -Trigger $mainTriggers -Settings $mainSettings -Principal $principal -Force|Out-Null
 Register-ScheduledTask -TaskName 'RELOO-WSL-Watchdog' -Action (& $actionFor $watchdogPath) -Trigger $watchTriggers -Settings $watchSettings -Principal $principal -Force|Out-Null
}elseif($StartAtBoot){
 $password=$Credential.GetNetworkCredential().Password
 try{
  Register-ScheduledTask -TaskName 'RELOO-WSL-Web' -Action (& $actionFor $launcherPath) -Trigger $mainTriggers -Settings $mainSettings -User $serverUser -Password $password -RunLevel Highest -Force|Out-Null
  Register-ScheduledTask -TaskName 'RELOO-WSL-Watchdog' -Action (& $actionFor $watchdogPath) -Trigger $watchTriggers -Settings $watchSettings -User $serverUser -Password $password -RunLevel Highest -Force|Out-Null
 }finally{$password=$null}
}else{
 $principal=New-ScheduledTaskPrincipal -UserId $serverUser -LogonType Interactive -RunLevel Limited
 Register-ScheduledTask -TaskName 'RELOO-WSL-Web' -Action (& $actionFor $launcherPath) -Trigger $mainTriggers -Settings $mainSettings -Principal $principal -Force|Out-Null
 Register-ScheduledTask -TaskName 'RELOO-WSL-Watchdog' -Action (& $actionFor $watchdogPath) -Trigger $watchTriggers -Settings $watchSettings -Principal $principal -Force|Out-Null
}
Stop-ScheduledTask -TaskName 'RELOO-WSL-Web' -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName 'RELOO-WSL-Web'
$sleepSettingApplied=$false
if($PreventSleepOnAC){
 & powercfg.exe /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | Set-Content -LiteralPath (Join-Path $backupDirectory 'sleep-before.txt')
 & powercfg.exe /change standby-timeout-ac 0
 $sleepSettingApplied=($LASTEXITCODE -eq 0)
 if(!$sleepSettingApplied){Write-Warning 'Recovery tasks started, but the AC sleep setting could not be changed.'}
}
@{Installed=$true;StartAtBoot=[bool]$StartAtBoot;UseS4U=[bool]$UseS4U;SleepSettingApplied=$sleepSettingApplied;Backup=$backupDirectory}|ConvertTo-Json -Compress
