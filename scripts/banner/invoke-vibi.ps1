$ErrorActionPreference='Stop'
$taskRoot=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$vibiVault=Join-Path $taskRoot 'output/imagegen/openai-key.credential.xml'
$previousVibiKey=$env:VIBI_API_KEY
try {
 if(!$env:VIBI_API_KEY){
  $secureVibiKey=Import-Clixml -LiteralPath $vibiVault
  $credentialVibi=New-Object System.Management.Automation.PSCredential('vibi',$secureVibiKey)
  $env:VIBI_API_KEY=$credentialVibi.GetNetworkCredential().Password
 }
 node (Join-Path $PSScriptRoot 'generate-scenes.mjs')
} finally {
 if($null -eq $previousVibiKey){Remove-Item Env:VIBI_API_KEY -ErrorAction SilentlyContinue}else{$env:VIBI_API_KEY=$previousVibiKey}
 Remove-Variable secureVibiKey,credentialVibi -ErrorAction SilentlyContinue
}
