# Known Limitations — @ocr/runner-fleet

## Windows primary, cross-platform by design

All development and testing of this package is performed on Windows 11.
Linux and macOS paths are implemented but receive less test coverage.

**Specific gaps:**

| Platform | Status |
|----------|--------|
| Windows (scheduled tasks via PowerShell) | ✅ Primary — fully tested |
| Linux (systemd) | ⚙️ Implemented — light test coverage |
| macOS (launchd) | ❌ Not implemented — throws `PLATFORM_UNSUPPORTED` |

macOS support requires implementing `stopService`, `startService`, and
`getServiceState` using `launchctl`. PRs welcome.

## Token scope

The `githubToken` in fleet config must be a GitHub PAT (classic or fine-grained)
with **repo** scope. Organization-level runner management requires
**admin:org** scope instead. Fine-grained PATs need the
`"Administration" → Read and Write` repository permission.

## Registration token lifetime

GitHub registration tokens expire after **60 minutes**. The `TokenManager`
pre-fetches a replacement 15 minutes before expiry (configurable via
`tokenRefreshLeadMs`). If the machine is sleeping during that window, the
cached token may expire before it is used, and the next recovery attempt will
fetch a fresh one with a single additional round-trip.

## Single-repo fleet

The current implementation manages runners for one repository per `Fleet`
instance. Multi-repo fleet management requires multiple `Fleet` instances
with separate configs.

## No queue-based auto-scaling

Increment 1 includes queue depth monitoring (exposed in the dashboard) but
does not auto-provision or deprovision runners based on queue depth.
Auto-scaling is planned for Increment 2.

## Dashboard is static HTML

The observability dashboard (`runner-fleet dashboard`) writes a single
static HTML file. It auto-refreshes via `<meta http-equiv="refresh">`.
A live server with SSE or WebSocket push is planned for Increment 2.
