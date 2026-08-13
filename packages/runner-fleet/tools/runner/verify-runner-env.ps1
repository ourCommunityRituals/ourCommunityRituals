<#
.SYNOPSIS
  Verify a self-hosted runner's .env is provisioned correctly (the root cause of
  the BLOODRAVEN-2 semgrep exit-127 + hang: a bad/misordered PATH in .env).

.DESCRIPTION
  The fleet's fail-closed provision-on-recovery gate (platform.registerRunner)
  calls this BEFORE starting a recovered runner. If it returns non-zero, the
  fleet refuses to start the runner (ErrorCode.PROVISIONING_FAILED) rather than
  bring it back mis-PATHed.

  Invariant #11 (self_hosted_runner_bash_resolution): the runner .env PATH must
  resolve Git Bash (…\Git\usr\bin) and it must come BEFORE any WSL entry, so the
  `shell: bash` steps + console tools (semgrep) resolve correctly.

.OUTPUTS
  Exit code contract (consumed by platform.ts):
    0 = OK
    1 = no .env at the runner path
    2 = PATH= missing, or Git Bash not on PATH
    3 = PATH misordered (a WSL entry precedes Git Bash)
#>
param(
  [Parameter(Mandatory = $true)][string]$RunnerPath
)
$ErrorActionPreference = 'Stop'

$envFile = Join-Path $RunnerPath '.env'
if (-not (Test-Path $envFile)) {
  Write-Error "verify-runner-env: no .env at $envFile"
  exit 1
}

$pathLine = (Get-Content $envFile | Where-Object { $_ -match '^\s*PATH=' } | Select-Object -First 1)
if (-not $pathLine) {
  Write-Error 'verify-runner-env: no PATH= entry in .env'
  exit 2
}

# Locate Git Bash and (if present) WSL on the PATH line, case-insensitive.
$gitBashIdx = $pathLine.ToLower().IndexOf('git\usr\bin')
if ($gitBashIdx -lt 0) { $gitBashIdx = $pathLine.ToLower().IndexOf('git/usr/bin') }
$wslIdx = $pathLine.ToLower().IndexOf('\wsl')
if ($wslIdx -lt 0) { $wslIdx = $pathLine.ToLower().IndexOf('system32\wsl') }

if ($gitBashIdx -lt 0) {
  Write-Error 'verify-runner-env: Git Bash (…\Git\usr\bin) not on the runner PATH (#11)'
  exit 2
}
if ($wslIdx -ge 0 -and $wslIdx -lt $gitBashIdx) {
  Write-Error 'verify-runner-env: a WSL entry precedes Git Bash on the runner PATH (#11)'
  exit 3
}

Write-Host "verify-runner-env: OK for $RunnerPath (Git-Bash-first PATH present)"
exit 0
