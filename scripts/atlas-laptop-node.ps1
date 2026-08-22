param(
  [string]$Image = $(if ($env:ATLAS_IMAGE) { $env:ATLAS_IMAGE } else { 'ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest' })
)
$ErrorActionPreference = 'Stop'

if ($Image -notmatch '^ghcr\.io/winderaranguren-gif/atlas-enterprise-suite(:[A-Za-z0-9._-]+|@sha256:[a-f0-9]{64})$') {
  throw 'Unexpected ATLAS image.'
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) { throw 'Docker Desktop is required on Windows.' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is installed but the engine is not running.' }
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Compose = Join-Path $Root 'infra\laptop\compose.yml'
$env:ATLAS_IMAGE = $Image

& docker compose -f $Compose pull
if ($LASTEXITCODE -ne 0) { throw 'Unable to pull ATLAS image.' }
& docker compose -f $Compose up -d
if ($LASTEXITCODE -ne 0) { throw 'Unable to start ATLAS laptop node.' }

$healthy = $false
for ($i = 0; $i -lt 45; $i++) {
  $status = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' atlas-laptop-01 2>$null)
  if ($status -eq 'healthy') { $healthy = $true; break }
  if ($status -eq 'unhealthy') {
    & docker logs --tail 120 atlas-laptop-01
    throw 'ATLAS laptop node became unhealthy.'
  }
  Start-Sleep -Seconds 2
}
if (-not $healthy) { throw 'ATLAS laptop node did not become healthy.' }

Invoke-RestMethod -Uri 'http://127.0.0.1:8080/_atlas/health' -Method Get | Out-Null
Write-Host 'ATLAS LAPTOP NODE READY'
Write-Host 'Node: atlas-laptop-01'
Write-Host "Runtime: $Image"
Write-Host 'Local URL: http://127.0.0.1:8080'
Write-Host 'State: atlas_laptop_state'
Write-Host 'Exposure: localhost only'
