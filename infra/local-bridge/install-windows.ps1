param(
    [string]$PythonLauncher = "py"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Venv = Join-Path $Root ".venv"

Write-Host "ATLAS Module Bridge v1 setup"
Write-Host "Location: $Root"

& $PythonLauncher -3.11 -m venv $Venv
$Python = Join-Path $Venv "Scripts\python.exe"

& $Python -m pip install --upgrade pip setuptools wheel

Write-Host ""
Write-Host "Bridge runtime created. The bridge itself uses only Python stdlib."
Write-Host "For ATLAS Voice, install the separate voice requirements after confirming GPU/CPU compatibility:"
Write-Host "  & '$Python' -m pip install -r '$Root\voice\requirements.txt'"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Copy .env.example to a secure local .env or set environment variables through Windows."
Write-Host "2. Set ATLAS_BRIDGE_HEARTBEAT_URL and ATLAS_BRIDGE_NODE_SECRET."
Write-Host "3. Start with: & '$Python' '$Root\bridge_agent.py'"
Write-Host "4. Verify locally: Invoke-RestMethod http://127.0.0.1:8787/health"
Write-Host ""
Write-Host "Do not expose port 8787 directly to the Internet."
