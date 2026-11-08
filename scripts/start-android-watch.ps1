$ErrorActionPreference='Stop'
$agentMutex=New-Object System.Threading.Mutex($false,'Local\RelooAndroidBuildAgent')
if (!$agentMutex.WaitOne(0,$false)) { exit 0 }
$taskRoot=Split-Path $PSScriptRoot -Parent
$credentialPath=Join-Path $taskRoot 'output/deployment/android-publish.credential.xml'
if (!(Test-Path -LiteralPath $credentialPath)) { exit 1 }
$log=Join-Path $taskRoot 'output/mobile/build-agent-service.log'
try {
 $credential=Import-Clixml -LiteralPath $credentialPath
 $env:RELOO_BUILD_PUBLISH_PASSWORD=$credential.GetNetworkCredential().Password
 $node=Join-Path $env:ProgramFiles 'nodejs/node.exe'
 & $node (Join-Path $taskRoot 'scripts/watch-android-release.mjs') *> $log
} catch { $_.Exception.Message | Add-Content -LiteralPath $log } finally { $agentMutex.ReleaseMutex();$agentMutex.Dispose() }
