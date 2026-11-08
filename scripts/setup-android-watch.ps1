$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$path=Join-Path $taskRoot 'output/deployment/android-publish.credential.xml'
New-Item -ItemType Directory -Force -Path (Split-Path $path -Parent) | Out-Null
$secret=ConvertTo-SecureString $env:RELOO_BUILD_PUBLISH_PASSWORD -AsPlainText -Force
$credential=New-Object System.Management.Automation.PSCredential('root',$secret)
$credential | Export-Clixml -LiteralPath $path
$acl=Get-Acl -LiteralPath $path
$acl.SetAccessRuleProtection($true,$false)
$who=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$rule=New-Object Security.AccessControl.FileSystemAccessRule($who,'FullControl','Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $path -AclObject $acl
$vbs=Join-Path $taskRoot 'output/mobile/start-android-agent.vbs'
$script=Join-Path $PSScriptRoot 'start-android-watch.ps1'
$command='powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$script+'"'
('CreateObject("WScript.Shell").Run "'+$command.Replace('"','""')+'", 0, False') | Set-Content -LiteralPath $vbs -Encoding ASCII
$shell=New-Object -ComObject WScript.Shell
$shortcut=$shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'Reloo Android Build Agent.lnk'))
$shortcut.TargetPath=Join-Path $env:WINDIR 'System32/wscript.exe'
$shortcut.Arguments='"'+$vbs+'"'
$shortcut.WorkingDirectory=$taskRoot
$shortcut.Save()
Start-Process -FilePath $shortcut.TargetPath -ArgumentList $shortcut.Arguments -WindowStyle Hidden
Write-Output 'Android build agent configured with protected credentials and automatic startup.'
