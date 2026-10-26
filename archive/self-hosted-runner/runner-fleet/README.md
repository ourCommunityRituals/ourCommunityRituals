# @ocr/runner-fleet

GitHub Actions self-hosted runner fleet manager for OurCommunityRituals.

Owns the full runner lifecycle: registration token rotation, health monitoring,
automatic recovery (restart → re-register), and a static observability dashboard.

## Quick start

```bash
# 1. Copy and edit the config
cp fleet.config.example.json fleet.config.json

# 2. Check status
pnpm runner-fleet:status

# 3. Run the watchdog continuously
pnpm runner-fleet:watch

# 4. Generate a dashboard
pnpm runner-fleet:dashboard
# open fleet-dashboard.html in a browser
```

## Config (`fleet.config.json`)

```json
{
  "githubToken": "ghp_...",
  "repoOwner": "ourCommunityRituals",
  "repoName": "ourSharedEvents",
  "runners": [
    {
      "name": "BLOODRAVEN-2",
      "path": "C:/Users/you/dev/ourCommunityRituals/actions-runner-2",
      "taskName": "GitHubActionsRunner-2"
    },
    {
      "name": "BLOODRAVEN-3",
      "path": "C:/Users/you/dev/ourCommunityRituals/actions-runner-3",
      "taskName": "GitHubActionsRunner-3"
    }
  ],
  "watchdogIntervalMs": 60000,
  "tokenRefreshLeadMs": 900000,
  "maxRestartAttempts": 2
}
```

## Commands

| Command | What it does |
|---------|--------------|
| `status` | Show live runner health and queue depth |
| `bounce` | One watchdog cycle — restart any offline runners |
| `register` | Re-register offline runners with a fresh GitHub token |
| `dashboard` | Write a static HTML observability dashboard |
| `watch` | Run the watchdog continuously (Ctrl+C to stop) |

Options: `--config=<path>` (default: `fleet.config.json`), `--out=<path>` (dashboard only).

## Architecture

```
Fleet
├── GitHubClient    GitHub REST API (runner list, token fetch, queue depth)
├── TokenManager    Pre-fetches registration tokens; rotates before expiry
├── Watchdog        Polls GitHub; detects offline runners; triggers recovery
│   ├── Step 1      Stop + Start scheduled task / systemd service
│   └── Step 2      Fresh token → config.cmd / config.sh → re-register
└── renderDashboard Static HTML snapshot of fleet state + event log
```

## Error taxonomy

| Code | Meaning | Auto-recoverable |
|------|---------|-----------------|
| `TOKEN_EXPIRED` | Token past expiry window | Yes |
| `TOKEN_FETCH_FAILED` | GitHub API unavailable | Yes |
| `TOKEN_INVALID` | PAT lacks required scope | **No** — fix manually |
| `REGISTRATION_LOST` | Runner deleted from GitHub (inactive) | Yes |
| `REGISTRATION_FAILED` | config.cmd/config.sh failed | Yes |
| `SERVICE_START_FAILED` | Scheduled task / systemd start failed | Yes |
| `SERVICE_STOP_FAILED` | Scheduled task / systemd stop failed | Yes |
| `NETWORK_DROP` | GitHub API unreachable | Yes |
| `RATE_LIMITED` | API rate limit | Yes |
| `PLATFORM_UNSUPPORTED` | macOS not implemented | **No** |
| `CONFIG_INVALID` | Missing required config field | **No** — fix config |

## Known limitations

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

## Testing

```bash
pnpm runner-fleet:test
```

## CI

Changes to `packages/runner-fleet/**` trigger the `runner-fleet` job in
`../../.github/workflows/ci.yml`.
