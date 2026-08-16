# ATLAS Sovereign Node 01 - Windows bootstrap
# Run in PowerShell as Administrator.
$ErrorActionPreference = 'Stop'

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
  Write-Host 'ATLAS requires PowerShell opened as Administrator.' -ForegroundColor Red
  exit 1
}

Write-Host 'ATLAS Sovereign Node 01 bootstrap starting...' -ForegroundColor Cyan

# Phase 1: ensure WSL + Ubuntu exist.
$distros = (& wsl.exe -l -q 2>$null) -join "`n"
if ($LASTEXITCODE -ne 0 -or -not $distros) {
  Write-Host 'Installing WSL2 + Ubuntu. Windows may require one restart.' -ForegroundColor Yellow
  & wsl.exe --install -d Ubuntu
  Write-Host 'Restart Windows, launch Ubuntu once to create the Linux user, then run this script again.' -ForegroundColor Yellow
  exit 10
}

if ($distros -notmatch '(?im)^Ubuntu') {
  Write-Host 'Installing Ubuntu for ATLAS...' -ForegroundColor Yellow
  & wsl.exe --install -d Ubuntu
  Write-Host 'Launch Ubuntu once to finish initialization, then run this script again.' -ForegroundColor Yellow
  exit 11
}

try { & wsl.exe --update | Out-Host } catch {}

# Phase 2: install Linux prerequisites and stage the current repository when this
# script is run from inside an ATLAS checkout.
$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRootLinux = (& wsl.exe wslpath -a "$repoRoot").Trim()
if (-not $repoRootLinux) {
  Write-Host 'Could not map the ATLAS repository into WSL.' -ForegroundColor Red
  exit 20
}

$linux = @"
set -e
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates openssl nodejs npm
cd '$repoRootLinux'
sudo bash sovereign/bootstrap.sh
sudo mkdir -p /opt/atlas/source
sudo rsync -a --delete --exclude .git ./ /opt/atlas/source/
sudo chown -R atlas:atlas /opt/atlas/source
sudo bash sovereign/deploy-release.sh /opt/atlas/source "bootstrap-$(date -u +%Y%m%dT%H%M%SZ)"
systemctl --no-pager --full status atlas-forge atlas-edge || true
"@

& wsl.exe -d Ubuntu -- bash -lc $linux
if ($LASTEXITCODE -ne 0) {
  Write-Host 'ATLAS Linux bootstrap did not finish. Review the error above.' -ForegroundColor Red
  exit $LASTEXITCODE
}

# Phase 3: keep the WSL node started after Windows logon.
$taskName = 'ATLAS-Sovereign-Node01'
$action = New-ScheduledTaskAction -Execute 'wsl.exe' -Argument '-d Ubuntu -- bash -lc "sudo systemctl start atlas-forge atlas-edge; exec sleep infinity"'
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null
} catch {
  Write-Host 'Core installed; scheduled auto-start needs to be created manually if Windows blocks it.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'ATLAS Sovereign Node 01 is installed.' -ForegroundColor Green
Write-Host 'Forge local: http://127.0.0.1:7401'
Write-Host 'Edge local:  http://127.0.0.1:7402'
Write-Host 'Next phase: public ingress + atlasenterprisesuite.com cutover.' -ForegroundColor Cyan
