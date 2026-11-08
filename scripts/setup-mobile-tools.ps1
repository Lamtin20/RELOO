$ErrorActionPreference = 'Stop'
$toolsRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'output/mobile-tools'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
function Get-VerifiedArchive($Url, $Destination, $Algorithm, $Checksum) {
  if (!(Test-Path -LiteralPath $Destination)) { Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination }
  if ((Get-FileHash -LiteralPath $Destination -Algorithm $Algorithm).Hash.ToLower() -ne $Checksum) { throw "Downloaded archive checksum mismatch: $Destination" }
}
$jdkArchive = Join-Path $toolsRoot 'jdk21.zip'
Get-VerifiedArchive 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip' $jdkArchive 'SHA256' 'f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e'
$jdkFolder = Join-Path $toolsRoot 'jdk'
if (!(Test-Path -LiteralPath $jdkFolder)) { Expand-Archive -LiteralPath $jdkArchive -DestinationPath $jdkFolder }
$javaRoot = (Get-ChildItem -LiteralPath $jdkFolder -Directory | Select-Object -First 1).FullName
$sdkArchive = Join-Path $toolsRoot 'android-commandline.zip'
Get-VerifiedArchive 'https://dl.google.com/android/repository/commandlinetools-win-16111833_latest.zip' $sdkArchive 'SHA1' '57d04f2d75eb8e8fffc5000a987e5de4b5a63e9d'
$sdkRoot = Join-Path $toolsRoot 'android-sdk'
$cmdRoot = Join-Path $sdkRoot 'cmdline-tools/latest'
if (!(Test-Path -LiteralPath (Join-Path $cmdRoot 'bin/sdkmanager.bat'))) {
  $extractRoot = Join-Path $toolsRoot 'sdk-extract'
  if (!(Test-Path -LiteralPath $extractRoot)) { Expand-Archive -LiteralPath $sdkArchive -DestinationPath $extractRoot }
  New-Item -ItemType Directory -Force -Path $cmdRoot | Out-Null
  Copy-Item -Path (Join-Path $extractRoot 'cmdline-tools/*') -Destination $cmdRoot -Recurse -Force
}
$env:JAVA_HOME = $javaRoot
$env:ANDROID_HOME = $sdkRoot
$env:Path = "$javaRoot/bin;$sdkRoot/platform-tools;$env:Path"
$androidCli = Join-Path $cmdRoot 'bin/android.exe'
foreach ($sdkPackage in @('platform-tools','platforms;android-36','build-tools;36.0.0')) {
  & $androidCli --no-metrics "--sdk=$sdkRoot" sdk install $sdkPackage
  if ($LASTEXITCODE -ne 0) { throw "Android SDK installation failed: $sdkPackage" }
}
if (!(Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms/android-36/android.jar')) -or !(Test-Path -LiteralPath (Join-Path $sdkRoot 'build-tools/36.0.0/aapt2.exe'))) { throw 'Android build packages are incomplete' }
@{javaRoot=$javaRoot;sdkRoot=$sdkRoot} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $toolsRoot 'tools.json') -Encoding UTF8
Write-Output 'Android build tools ready.'
