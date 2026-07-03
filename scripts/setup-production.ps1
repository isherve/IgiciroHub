# One-click setup for production deployment.
# Run from repo root:  .\scripts\setup-production.ps1

$RepoUrl = "https://github.com/isherve/IgiciroHub"
$RenderBlueprint = "https://dashboard.render.com/blueprint/new?repo=$RepoUrl"
$ExpoLogin = "https://expo.dev/login"
$ExpoTokens = "https://expo.dev/accounts/[your-account]/settings/access-tokens"
$GitHubSecrets = "https://github.com/isherve/IgiciroHub/settings/secrets/actions"
$GitHubPages = "https://github.com/isherve/IgiciroHub/settings/pages"

Write-Host ""
Write-Host "=== IgiciroHub Production Setup ===" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Deploy backend on Render (opens browser)..." -ForegroundColor Cyan
Write-Host "  -> Click Apply on the Blueprint, wait for deploy to finish."
Start-Process $RenderBlueprint
Start-Sleep -Seconds 2

Write-Host "Step 2: Enable GitHub Pages for privacy policy..." -ForegroundColor Cyan
Write-Host "  -> Settings > Pages > Source: GitHub Actions"
Start-Process $GitHubPages
Start-Sleep -Seconds 2

Write-Host "Step 3: Expo login (opens browser + CLI)..." -ForegroundColor Cyan
Start-Process $ExpoLogin
Set-Location "$PSScriptRoot\..\frontend"
npx eas-cli login

Write-Host "Step 4: Link project to Expo..." -ForegroundColor Cyan
npx eas-cli build:configure

Write-Host "Step 5: Build Android preview APK..." -ForegroundColor Cyan
npx eas-cli build --platform android --profile preview

Write-Host ""
Write-Host "Optional: Add EXPO_TOKEN to GitHub Secrets for CI builds:" -ForegroundColor Yellow
Write-Host "  $ExpoTokens"
Write-Host "  $GitHubSecrets"
Write-Host ""
Write-Host "After Render deploy, verify: https://igicirohub-api.onrender.com/" -ForegroundColor Green
Write-Host "Privacy policy: https://isherve.github.io/IgiciroHub/" -ForegroundColor Green
