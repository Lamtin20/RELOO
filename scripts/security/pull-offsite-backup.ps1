$ErrorActionPreference='Stop'
$workspaceRoot=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$credential=Import-Clixml -LiteralPath (Join-Path $workspaceRoot 'output/deployment/android-publish.credential.xml')
$previousPassword=$env:RELOO_BUILD_PUBLISH_PASSWORD
try{
 $env:RELOO_BUILD_PUBLISH_PASSWORD=$credential.GetNetworkCredential().Password
 Push-Location -LiteralPath $workspaceRoot
 try{& node (Join-Path $PSScriptRoot 'pull-offsite-backup.mjs');if($LASTEXITCODE -ne 0){throw 'Offsite backup sync failed.'}}finally{Pop-Location}
}finally{
 if($null -eq $previousPassword){Remove-Item Env:RELOO_BUILD_PUBLISH_PASSWORD -ErrorAction SilentlyContinue}else{$env:RELOO_BUILD_PUBLISH_PASSWORD=$previousPassword}
}
