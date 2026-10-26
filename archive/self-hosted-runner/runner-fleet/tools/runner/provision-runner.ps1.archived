<#
.SYNOPSIS
  Idempotently provision a self-hosted runner's .env from the canonical source
  (Git-Bash-first PATH). Consolidates the ad-hoc root scripts (_fix-runner-env.ps1,
  _apply-runner-provisioning.ps1) into the fleet package (invariant #13:
  enforcement co-located with the package that owns it).

.DESCRIPTION
  The canonical .env (from the original actions-runner install) has the correct
  Git-Bash-first PATH. A runner whose .env drifted (WSL-first / missing Python
  Scripts) hits the BLOODRAVEN-2 semgrep exit-127 + shell-resolution failures.
  This copies the canonical .env into the target runner if it differs.

  Idempotent: no-op when the target .env already matches the canonical.
  Does NOT restart the runner — that is the fleet's job (platform.startService)
  AFTER verify-runner-env.ps1 passes.

.OUTPUTS
  Exit 0 on success (already-correct or fixed); non-zero on failure.
#>
param(
  [Parameter(Mandatory = $true)][string]$RunnerPath,
  [string]$CanonicalEnv = (Join-Path (Split-Path $RunnerPath -Parent) 'actions-runner\.env')
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $CanonicalEnv)) {
  Write-Error "provision-runner: canonical .env not found at $CanonicalEnv"
  exit 1
}
if (-not (Test-Path $RunnerPath)) {
  Write-Error "provision-runner: runner path not found at $RunnerPath"
  exit 1
}

$target = Join-Path $RunnerPath '.env'
$canonicalHash = (Get-FileHash $CanonicalEnv -Algorithm SHA256).Hash
$targetHash = if (Test-Path $target) { (Get-FileHash $target -Algorithm SHA256).Hash } else { '' }

if ($canonicalHash -eq $targetHash) {
  Write-Host "provision-runner: $target already canonical — no-op"
  exit 0
}

Copy-Item -Path $CanonicalEnv -Destination $target -Force
Write-Host "provision-runner: wrote canonical .env -> $target"
exit 0
