# Re-register BLOODRAVEN-3 with GitHub.
#
# Run this when GitHub has deleted the runner registration due to inactivity.
# Symptoms: Runner_*.log shows "Registration was not found or is not medium trust."
#
# BEFORE RUNNING:
#   1. Go to: https://github.com/ourCommunityRituals/ourSharedEvents/settings/actions/runners/new
#   2. Select: Linux → (token shown on page)  OR  Windows → copy the --token value
#   3. Paste the token below as $RegistrationToken
#
# Requires: Run as the same user account the scheduled task runs under (no elevation needed).

param(
    [Parameter(Mandatory)]
    [string]$RegistrationToken
)

$ErrorActionPreference = 'Stop'
$RunnerPath = 'C:\Users\mzdan\dev\ourCommunityRituals\actions-runner-3'
$TaskName   = 'GitHubActionsRunner-3'
$RepoUrl    = 'https://github.com/ourCommunityRituals/ourSharedEvents'
$RunnerName = 'BLOODRAVEN-3'
$Labels     = 'self-hosted,Windows,X64'

Write-Host ""
Write-Host "=== BLOODRAVEN-3 Re-registration ==="
Write-Host ""

# Step 1: stop the task if running
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq 'Running') {
    Write-Host "Stopping scheduled task $TaskName..."
    Stop-ScheduledTask -TaskName $TaskName
    Start-Sleep 5
}

# Step 2: run config.cmd --replace
Write-Host "Running config.cmd --replace for $RunnerName..."
Push-Location $RunnerPath
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

# Step 3: restart the task
Write-Host "Starting scheduled task $TaskName..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep 8

# Step 4: verify
$state = (Get-ScheduledTask -TaskName $TaskName).State
$listener = Get-Process Runner.Listener -ErrorAction SilentlyContinue |
            Where-Object { $_.Path -and $_.Path.StartsWith($RunnerPath) }

Write-Host ""
Write-Host "--- Result ---"
Write-Host "  Scheduled task state : $state"
Write-Host "  Runner.Listener PIDs : $($listener.Id -join ', ')"

if ($state -eq 'Running' -or $listener.Count -gt 0) {
    Write-Host ""
    Write-Host "  BLOODRAVEN-3 is back online." -ForegroundColor Green
    Write-Host "  Check GitHub: https://github.com/ourCommunityRituals/ourSharedEvents/settings/actions/runners"
} else {
    Write-Host ""
    Write-Host "  WARNING: runner may not be online yet — check logs at:" -ForegroundColor Yellow
    Write-Host "  $RunnerPath\_diag\"
}
