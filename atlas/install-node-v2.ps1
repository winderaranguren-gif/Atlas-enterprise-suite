$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
Set-Location $Root
Write-Host 'Installing ATLAS Node Agent v2'
$env:ATLAS_NODE_ID='winder-laptop-01'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required' }
$task='ATLAS Node Agent v2'
$node=(Get-Command node).Source
$script=Join-Path $Root 'atlas\node-agent-v2.mjs'
$action=New-ScheduledTaskAction -Execute $node -Argument ('"'+$script+'"') -WorkingDirectory $Root
$trigger=New-ScheduledTaskTrigger -AtLogOn
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $task -Action $action -Trigger $trigger -Settings $settings -Description 'ATLAS sovereign outbound node agent' -Force | Out-Null
Start-ScheduledTask -TaskName $task
Write-Host 'ATLAS Node Agent v2 scheduled and started.'
