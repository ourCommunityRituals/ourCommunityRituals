import type { FleetSnapshot } from './types.ts';
import type { WatchdogEvent } from './watchdog.ts';

function statusColor(status: string): string {
  switch (status) {
    case 'online':
      return '#22c55e';
    case 'busy':
      return '#f59e0b';
    case 'offline':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderDashboard(
  snapshot: FleetSnapshot,
  events: ReadonlyArray<{ ts: Date; event: WatchdogEvent }>,
  refreshMs = 30_000
): string {
  const cards = snapshot.runners
    .map((r) => {
      const color = statusColor(r.status);
      const label = r.busy ? `${r.status} (busy)` : r.status;
      return `
    <div class="card" style="border-left:4px solid ${color}">
      <div class="card-name">${esc(r.config.name)}</div>
      <div class="card-status" style="color:${color}">${esc(label)}</div>
      ${r.lastErrorCode ? `<div class="card-error">${esc(r.lastErrorCode)}</div>` : ''}
      ${
        r.lastRecovery !== null
          ? `<div class="card-recovery">Last recovery: ${esc(r.lastRecovery)}${r.lastRecoveryAt ? ` at ${r.lastRecoveryAt.toISOString()}` : ''}</div>`
          : ''
      }
      <div class="card-meta">Restart attempts: ${String(r.restartAttempts)}</div>
    </div>`;
    })
    .join('\n');

  const rows = [...events]
    .reverse()
    .slice(0, 50)
    .map((e) => {
      const runner = 'runner' in e.event ? esc(e.event.runner) : '—';
      const type = esc(e.event.type.replace(/_/g, ' '));
      return `<tr><td>${e.ts.toISOString()}</td><td>${runner}</td><td>${type}</td></tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>@ocr/runner-fleet</title>
  <meta http-equiv="refresh" content="${String(Math.round(refreshMs / 1000))}">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem;line-height:1.5}
    h1{font-size:1.5rem;font-weight:700;margin-bottom:.25rem}
    .meta{color:#94a3b8;font-size:.875rem;margin-bottom:2rem}
    h2{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:1rem}
    .section{margin-bottom:2.5rem}
    .cards{display:flex;gap:1rem;flex-wrap:wrap}
    .card{background:#1e293b;border-radius:.5rem;padding:1rem 1.25rem;min-width:220px}
    .card-name{font-weight:600;font-size:1rem;margin-bottom:.25rem}
    .card-status{font-size:.875rem;font-weight:500}
    .card-error{font-size:.75rem;color:#f87171;margin-top:.25rem}
    .card-recovery{font-size:.75rem;color:#a78bfa;margin-top:.25rem}
    .card-meta{font-size:.75rem;color:#475569;margin-top:.5rem}
    .queue{display:inline-block;background:#1e293b;border-radius:.5rem;padding:.75rem 1.5rem;font-size:1.5rem;font-weight:700}
    table{width:100%;border-collapse:collapse;font-size:.8125rem}
    th,td{text-align:left;padding:.375rem .5rem;border-bottom:1px solid #1e293b}
    th{color:#64748b;font-weight:500;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
    td:first-child{color:#94a3b8;font-family:monospace;font-size:.75rem}
  </style>
</head>
<body>
  <h1>@ocr/runner-fleet</h1>
  <div class="meta">
    Updated: ${snapshot.timestamp.toISOString()} &nbsp;·&nbsp;
    Auto-refresh: ${String(Math.round(refreshMs / 1000))}s
  </div>

  <div class="section">
    <h2>Runners (${String(snapshot.runners.length)})</h2>
    <div class="cards">${cards}</div>
  </div>

  <div class="section">
    <h2>Queue</h2>
    <div class="queue">${String(snapshot.queueDepth ?? '—')} pending</div>
  </div>

  <div class="section">
    <h2>Event log (last 50)</h2>
    <table>
      <thead><tr><th>Time</th><th>Runner</th><th>Event</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3" style="color:#475569">No events yet</td></tr>'}</tbody>
    </table>
  </div>
</body>
</html>`;
}
