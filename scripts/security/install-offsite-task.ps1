$ErrorActionPreference='Stop'
$workspaceRoot=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$launcher=Join-Path $PSScriptRoot 'pull-offsite-backup.ps1'
$windowsUser=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskAction=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$launcher+'"') -WorkingDirectory $workspaceRoot
$hourly=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(5)) -RepetitionInterval (New-TimeSpan -Hours 1)
$logon=New-ScheduledTaskTrigger -AtLogOn -User $windowsUser
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 45) -MultipleInstances IgnoreNew
$principal=New-ScheduledTaskPrincipal -UserId $windowsUser -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'RELOO-Encrypted-Offsite-Backup' -Action $taskAction -Trigger @($hourly,$logon) -Settings $settings -Principal $principal -Description 'Copy verified encrypted RELOO backups to this development machine while its Windows account is signed in.' -Force | Out-Null
Get-ScheduledTask -TaskName 'RELOO-Encrypted-Offsite-Backup' | Select-Object TaskName,State
