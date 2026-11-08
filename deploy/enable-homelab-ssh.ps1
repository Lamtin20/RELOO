[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)][System.Net.IPAddress]$ServerLanAddress,
    [Parameter(Mandatory = $true)][System.Net.IPAddress]$AllowedClientAddress,
    [Parameter(Mandatory = $true)][string]$Distro
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script in an elevated PowerShell on the actual homelab server.'
}
if ($ServerLanAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or
    $AllowedClientAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'Use IPv4 LAN addresses.'
}
if ($ServerLanAddress.Equals($AllowedClientAddress)) {
    throw 'The server and connecting client must be different machines.'
}
if (-not (Get-NetIPAddress -AddressFamily IPv4 | Where-Object IPAddress -eq $ServerLanAddress.ToString())) {
    throw "This machine does not own $ServerLanAddress. Run the script on the homelab server."
}

$wslAddresses = & wsl.exe -d $Distro -u root -- hostname -I
if ($LASTEXITCODE -ne 0) { throw 'Unable to start the specified WSL distribution.' }
$wslAddress = (($wslAddresses -join ' ').Trim() -split '\s+' | Where-Object {
    $candidate = $null
    [Net.IPAddress]::TryParse($_, [ref]$candidate) -and
        $candidate.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork
} | Select-Object -First 1)
if (-not $wslAddress) { throw 'WSL did not return an IPv4 address.' }

$proxyName = "$ServerLanAddress/22"
$proxyTarget = "$wslAddress/22"
$proxyKey = 'HKLM:\SYSTEM\CurrentControlSet\Services\PortProxy\v4tov4\tcp'
$existing = Get-ItemProperty -LiteralPath $proxyKey -Name $proxyName -ErrorAction SilentlyContinue
$existingTarget = if ($existing) { $existing.PSObject.Properties[$proxyName].Value } else { $null }
if ($existingTarget -and $existingTarget -ne $proxyTarget) {
    throw "An existing SSH port proxy points to $existingTarget. Inspect it before making changes."
}
$otherProxy = Get-ItemProperty -LiteralPath $proxyKey -Name '0.0.0.0/22' -ErrorAction SilentlyContinue
if ($otherProxy) { throw 'An all-interface SSH port proxy already exists. Inspect it first.' }
$listener = Get-NetTCPConnection -State Listen -LocalPort 22 -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalAddress -in @('0.0.0.0', '::', $ServerLanAddress.ToString()) }
if ($listener -and -not $existingTarget) { throw 'Port 22 is already used by another Windows listener.' }

$ruleName = 'RELOO-WSL-SSH-LAN'
if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
    throw "Firewall rule $ruleName already exists. Inspect it before rerunning this bootstrap."
}
if (-not $PSCmdlet.ShouldProcess($ServerLanAddress, "Start WSL SSH and forward port 22 only for $AllowedClientAddress")) {
    return
}

& wsl.exe -d $Distro -u root -- install -d -m 0755 /run/sshd
if ($LASTEXITCODE -ne 0) { throw 'Unable to prepare the SSH runtime directory.' }
& wsl.exe -d $Distro -u root -- /usr/sbin/sshd -t
if ($LASTEXITCODE -ne 0) { throw 'OpenSSH configuration is not ready. Install openssh-server and run sshd -t in Ubuntu first.' }
& wsl.exe -d $Distro -u root -- service ssh start
if ($LASTEXITCODE -ne 0) { throw 'The WSL SSH service did not start.' }

$client = [Net.Sockets.TcpClient]::new()
try {
    $connection = $client.ConnectAsync($wslAddress, 22)
    if (-not $connection.Wait(3000) -or -not $client.Connected) {
        throw 'WSL SSH is not reachable at its IPv4 address.'
    }
} finally { $client.Dispose() }

Start-Service iphlpsvc
$createdProxy = $false
try {
    if (-not $existingTarget) {
        & netsh.exe interface portproxy add v4tov4 "listenaddress=$ServerLanAddress" listenport=22 "connectaddress=$wslAddress" connectport=22
        if ($LASTEXITCODE -ne 0) { throw 'Failed to create the SSH port proxy.' }
        $createdProxy = $true
    }
    New-NetFirewallRule -Name $ruleName -DisplayName 'RELOO WSL SSH from development laptop' `
        -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 `
        -LocalAddress $ServerLanAddress.ToString() -RemoteAddress $AllowedClientAddress.ToString() `
        -Profile Any | Out-Null
} catch {
    if ($createdProxy) {
        & netsh.exe interface portproxy delete v4tov4 "listenaddress=$ServerLanAddress" listenport=22 | Out-Null
    }
    throw
}

Write-Output "SSH forwarding ready: ${ServerLanAddress}:22 -> ${wslAddress}:22; allowed client: $AllowedClientAddress"
Write-Output 'SSH authentication settings were preserved. This forwarding must be checked after WSL changes its IP.'
