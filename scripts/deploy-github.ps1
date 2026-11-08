# Deploy RELOO to GitHub (Lamtin20/RELOO) and link GitHub Project
# Prerequisites: gh auth login

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "Checking GitHub CLI auth..."
gh auth status | Out-Null

$owner = "Lamtin20"
$repo = "RELOO"

if (-not (gh repo view "$owner/$repo" 2>$null)) {
  Write-Host "Creating repository $owner/$repo ..."
  gh repo create "$owner/$repo" --public --description "RELOO — Nền tảng cho thuê tài sản P2P (Trust Platform)" --source . --remote origin
} else {
  if (-not (git remote get-url origin 2>$null)) {
    git remote add origin "https://github.com/$owner/$repo.git"
  }
}

Write-Host "Pushing to GitHub..."
git branch -M main 2>$null
git push -u origin main

Write-Host "Linking to GitHub Project RELOO (if project exists)..."
$projectNumber = gh project list --owner $owner --format json 2>$null | ConvertFrom-Json | Where-Object { $_.title -eq "RELOO" } | Select-Object -ExpandProperty number -First 1
if ($projectNumber) {
  gh project item-add $projectNumber --owner $owner --url "https://github.com/$owner/$repo"
  Write-Host "Added repo to project RELOO (#$projectNumber)"
} else {
  Write-Host "Project RELOO not found — create at https://github.com/users/$owner/projects and add repo manually."
}

Write-Host "Done: https://github.com/$owner/$repo"
