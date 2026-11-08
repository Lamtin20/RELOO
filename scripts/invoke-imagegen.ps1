param(
  [Parameter(Mandatory=$true)][string]$PromptFile,
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [ValidatePattern('^(auto|[0-9]+x[0-9]+)$')][string]$Size='1024x1024',
  [ValidateSet('low','medium','high','auto')][string]$Quality='medium'
)
$ErrorActionPreference='Stop'
$relooImageCli=Join-Path $env:USERPROFILE '.codex/skills/.system/imagegen/scripts/image_gen.py'
$relooImageVault=Join-Path $PSScriptRoot '../output/imagegen/openai-key.credential.xml'
if(!(Test-Path -LiteralPath $relooImageCli)){throw 'The bundled imagegen CLI was not found.'}
if(!(Test-Path -LiteralPath $relooImageVault)){throw 'The encrypted imagegen credential was not found.'}
$relooStoredKey=Import-Clixml -LiteralPath $relooImageVault
$relooCredential=New-Object System.Management.Automation.PSCredential('imagegen',$relooStoredKey)
$relooPreviousKey=$env:OPENAI_API_KEY
$relooPreviousBase=$env:OPENAI_BASE_URL
try {
  $env:OPENAI_API_KEY=$relooCredential.GetNetworkCredential().Password
  $relooProviderFile=Join-Path $PSScriptRoot '../output/imagegen/provider-config.json'
  if(Test-Path -LiteralPath $relooProviderFile){$relooProvider=Get-Content -LiteralPath $relooProviderFile -Raw | ConvertFrom-Json;$env:OPENAI_BASE_URL=$relooProvider.baseUrl}
  & python $relooImageCli generate --model gpt-image-2 --prompt-file $PromptFile --size $Size --quality $Quality --out $OutputFile
  if($LASTEXITCODE -ne 0){throw 'Image generation did not complete. Check the provider error without sharing credentials.'}
} finally {
  if($null -eq $relooPreviousKey){Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue}
  else{$env:OPENAI_API_KEY=$relooPreviousKey}
  if($null -eq $relooPreviousBase){Remove-Item Env:OPENAI_BASE_URL -ErrorAction SilentlyContinue}else{$env:OPENAI_BASE_URL=$relooPreviousBase}
  Remove-Variable relooStoredKey,relooCredential,relooPreviousKey,relooPreviousBase
}
