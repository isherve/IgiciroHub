# Set GEMINI_API_KEY on Render (requires Render API key from dashboard Account Settings).
# Usage:
#   $env:RENDER_API_KEY = "rnd_..."
#   $env:GEMINI_API_KEY = "AIza..."
#   .\scripts\set-gemini-on-render.ps1

param(
    [string]$RenderApiKey = $env:RENDER_API_KEY,
    [string]$GeminiApiKey = $env:GEMINI_API_KEY,
    [string]$ServiceName = "igicirohub-api"
)

if (-not $RenderApiKey) {
    Write-Error "Set RENDER_API_KEY (from https://dashboard.render.com/u/settings#api-keys)"
    exit 1
}
if (-not $GeminiApiKey) {
    Write-Error "Set GEMINI_API_KEY (from https://aistudio.google.com/apikey)"
    exit 1
}

$headers = @{
    Authorization = "Bearer $RenderApiKey"
    Accept        = "application/json"
    "Content-Type" = "application/json"
}

$services = Invoke-RestMethod -Uri "https://api.render.com/v1/services?limit=50" -Headers $headers
$service = $services | ForEach-Object { $_.service } | Where-Object { $_.name -eq $ServiceName } | Select-Object -First 1

if (-not $service) {
    Write-Error "Service '$ServiceName' not found on your Render account."
    exit 1
}

$serviceId = $service.id
Write-Host "Updating GEMINI_API_KEY on $ServiceName ($serviceId)..."

$body = @{ value = $GeminiApiKey } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$serviceId/env-vars/GEMINI_API_KEY" -Headers $headers -Body $body | Out-Null

Write-Host "Done. Render will redeploy igicirohub-api automatically."
Write-Host "Test: https://igicirohub-api.onrender.com/api/assistant/status/ (after login)"
