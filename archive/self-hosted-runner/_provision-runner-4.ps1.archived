# Provision BLOODRAVEN-4 — downloads, registers, and installs as a scheduled task.
#
# BEFORE RUNNING:
#   1. Go to: https://github.com/ourCommunityRituals/ourSharedEvents/settings/actions/runners/new
#   2. Select Windows x64 — copy the --token value from the config step shown on that page
#   3. Paste it below as $RegistrationToken
#
# Requires: Run as Administrator (needed to register a new scheduled task).
# After first run, the fleet watchdog handles everything automatically.

param(
    [Parameter(Mandatory)]
    [string]$RegistrationToken
)

$ErrorActionPreference = 'Stop'
$RunnerRoot = 'C:\Users\mzdan\dev\ourCommunityRituals\actions-runner-4'
$TaskName   = 'GitHubActionsRunner-4'
$RepoUrl    = 'https://github.com/ourCommunityRituals/ourSharedEvents'
$RunnerName = 'BLOODRAVEN-4'
$Labels     = 'self-hosted,Windows,X64'

# Match the version already installed in runner-2 and runner-3
$RunnerVersion = '2.336.0'
$RunnerPkg     = "actions-runner-win-x64-${RunnerVersion}.zip"
$RunnerUrl     = "https://github.com/actions/runner/releases/download/v${RunnerVersion}/${RunnerPkg}"

Write-Host ""
Write-Host "=== BLOODRAVEN-4 Provisioning ==="
Write-Host ""

# Step 1: create directory
if (Test-Path $RunnerRoot) {
    Write-Host "Directory already exists: $RunnerRoot"
} else {
    Write-Host "Creating $RunnerRoot..."
    New-Item -ItemType Directory -Path $RunnerRoot | Out-Null
}

# Step 2: download runner package (skip if already present)
$pkgPath = Join-Path $RunnerRoot $RunnerPkg
if (-not (Test-Path $pkgPath)) {
    Write-Host "Downloading GitHub Actions runner v${RunnerVersion}..."
    Invoke-WebRequest -Uri $RunnerUrl -OutFile $pkgPath -UseBasicParsing
    Write-Host "  Downloaded: $pkgPath"
} else {
    Write-Host "  Package already present, skipping download."
}

# Step 3: extract
$extractedMarker = Join-Path $RunnerRoot 'config.cmd'
if (-not (Test-Path $extractedMarker)) {
    Write-Host "Extracting runner package..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($pkgPath, $RunnerRoot)
    Write-Host "  Extracted."
} else {
    Write-Host "  Already extracted, skipping."
}

# Step 4: register with GitHub
Write-Host "Registering $RunnerName with GitHub..."
Push-Location $RunnerRoot
try {
    & .\config.cmd `
        --url $RepoUrl `
        --token $RegistrationToken `
        --name $RunnerName `
        --labels $Labels `
        --unattended `
        --replace
    if ($LASTEXITCODE -ne 0) {
        throw "config.cmd exited with code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
Write-Host "  Registration complete."

# Step 5: install as a scheduled task
# Uses the same pattern as runners 2 and 3: run.cmd launched via a hidden VBS wrapper
# so no console window flashes when the task fires.
$vbsLauncher = 'C:\Users\mzdan\dev\ourCommunityRituals\_run-hidden.vbs'
$runCmd      = Join-Path $RunnerRoot 'run.cmd'

Write-Host "Creating scheduled task $TaskName..."

$action  = New-ScheduledTaskAction `
    -Execute 'wscript.exe' `
    -Argument "`"$vbsLauncher`" `"$runCmd`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "  Scheduled task registered."

# Step 6: start it now
Write-Host "Starting $TaskName..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep 8

# Step 7: verify
$state    = (Get-ScheduledTask -TaskName $TaskName).State
$listener = Get-Process Runner.Listener -ErrorAction SilentlyContinue |
            Where-Object { $_.Path -and $_.Path.StartsWith($RunnerRoot) }

Write-Host ""
Write-Host "--- Result ---"
Write-Host "  Scheduled task state : $state"
Write-Host "  Runner.Listener PIDs : $($listener.Id -join ', ')"

if ($state -eq 'Running' -or $listener.Count -gt 0) {
    Write-Host ""
    Write-Host "  BLOODRAVEN-4 is online." -ForegroundColor Green
    Write-Host "  Check GitHub: https://github.com/ourCommunityRituals/ourSharedEvents/settings/actions/runners"
    Write-Host ""
    Write-Host "  Add BLOODRAVEN-4 to fleet.config.json:"
    Write-Host '  {'
    Write-Host '    "name": "BLOODRAVEN-4",'
    Write-Host "    `"path`": `"$RunnerRoot`","
    Write-Host '    "taskName": "GitHubActionsRunner-4"'
    Write-Host '  }'
} else {
    Write-Host ""
    Write-Host "  WARNING: runner may not be online — check logs at:" -ForegroundColor Yellow
    Write-Host "  $RunnerRoot\_diag\"
}
