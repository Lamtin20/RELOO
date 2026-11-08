$ErrorActionPreference = 'Stop'
$apkMutex=New-Object System.Threading.Mutex($false,'Local\RelooAndroidApkBuild')
try { $null=$apkMutex.WaitOne() } catch [System.Threading.AbandonedMutexException] {}
try {
$appRoot = Split-Path $PSScriptRoot -Parent
$tools = Get-Content -LiteralPath (Join-Path $appRoot 'output/mobile-tools/tools.json') -Raw | ConvertFrom-Json
$env:JAVA_HOME = $tools.javaRoot
$env:ANDROID_HOME = $tools.sdkRoot
$env:Path = "$($tools.javaRoot)/bin;$($tools.sdkRoot)/platform-tools;$env:Path"
node (Join-Path $appRoot 'scripts/prepare-mobile-assets.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Mobile branding generation failed' }
$releaseCode = [int][Math]::Floor([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()/60)
$previousRelease=Join-Path $appRoot 'output/mobile/latest.json'
if (Test-Path -LiteralPath $previousRelease) { $previousCode=(Get-Content -LiteralPath $previousRelease -Raw | ConvertFrom-Json).versionCode; $releaseCode=[Math]::Max($releaseCode,[int]$previousCode+1) }
$releaseVersion = '1.0.1-beta.' + [DateTimeOffset]::Now.ToString('yyyyMMdd.HHmm')
$project = Join-Path $appRoot 'mobile/android'
$sdkLiteral = $tools.sdkRoot.Replace('\','/').Replace(':','\:')
"sdk.dir=$sdkLiteral" | Set-Content -LiteralPath (Join-Path $project 'local.properties') -Encoding ASCII
Push-Location $project
try {
  & .\gradlew.bat --no-daemon --max-workers=2 "-PrelooVersionCode=$releaseCode" "-PrelooVersionName=$releaseVersion" assembleDebug
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }
$artifactRoot = Join-Path $appRoot 'output/mobile'
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $project 'app/build/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $artifactRoot 'RELOO-Android-test.apk') -Force
$immutableRoot=Join-Path $artifactRoot 'releases'
New-Item -ItemType Directory -Force -Path $immutableRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $artifactRoot 'RELOO-Android-test.apk') -Destination (Join-Path $immutableRoot "reloo-$releaseCode.apk") -Force
Write-Output (Join-Path $artifactRoot 'RELOO-Android-test.apk')
@{versionCode=$releaseCode;version=$releaseVersion;filename="reloo-$releaseCode.apk";sha256=(Get-FileHash -LiteralPath (Join-Path $artifactRoot 'RELOO-Android-test.apk') -Algorithm SHA256).Hash.ToLower();builtAt=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $artifactRoot 'latest.json') -Encoding UTF8

} finally { $apkMutex.ReleaseMutex();$apkMutex.Dispose() }
