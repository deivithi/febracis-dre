# run-pg17-wsl.ps1 — encaminha scripts pg17 para WSL (evita quoting inline)
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('health', 'backup-verify', 'restore-drill')]
    [string]$Command
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$ScriptDir = Join-Path $RepoRoot 'scripts\pg17'
$Map = @{
    'health'        = 'pg17-health.sh'
    'backup-verify' = 'backup-verify.sh'
    'restore-drill' = 'restore-drill.sh'
}

$ScriptName = $Map[$Command]
$WinPath = Join-Path $ScriptDir $ScriptName

if (-not (Test-Path $WinPath)) {
    Write-Error "Script not found: $WinPath"
}

# Caminho WSL (/mnt/c/...)
$Drive = $WinPath.Substring(0, 1).ToLower()
$WslPath = "/mnt/$Drive/" + ($WinPath.Substring(3) -replace '\\', '/')

$Inner = "sed 's/`r`$//' '$WslPath' > /tmp/pg17-run.sh && chmod +x /tmp/pg17-run.sh && bash /tmp/pg17-run.sh"
wsl -d Ubuntu-24.04 -- bash -lc $Inner
