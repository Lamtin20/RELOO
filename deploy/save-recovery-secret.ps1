[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$recoveryDirectory=Join-Path $env:LOCALAPPDATA 'RELOO-Recovery'
New-Item -ItemType Directory -Path $recoveryDirectory -Force|Out-Null
$recoverySecret=Read-Host 'Sunshine password (hidden)' -AsSecureString
if($recoverySecret.Length -eq 0){throw 'Password was empty.'}
$recoverySecret|Export-Clixml -LiteralPath (Join-Path $recoveryDirectory 'sunshine-password.secure.xml')
Write-Output 'SUNSHINE_SECRET_SAVED_WITH_WINDOWS_DPAPI'
