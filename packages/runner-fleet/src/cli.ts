#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { Fleet } from './fleet.ts';
import { renderDashboard } from './dashboard.ts';
import type { FleetConfig } from './types.ts';

function loadConfig(path: string): FleetConfig {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as FleetConfig;
  } catch (e) {
    console.error(`Cannot read fleet config at '${path}': ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

function flagValue(args: string[], prefix: string): string | undefined {
  return args.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const [, , cmd, ...args] = process.argv;
const configPath = flagValue(args, '--config=') ?? 'fleet.config.json';

async function main(): Promise<void> {
  switch (cmd) {
    case 'status': {
      const fleet = new Fleet(loadConfig(configPath));
      await fleet.runOnce();
      const snap = await fleet.snapshot();
      console.log('\n=== @ocr/runner-fleet ===\n');
      for (const r of snap.runners) {
        const icon = r.status === 'online' || r.status === 'busy' ? '✓' : '✗';
        const busy = r.busy ? ' (busy)' : '';
        const err = r.lastErrorCode ? `  [${r.lastErrorCode}]` : '';
        console.log(`  ${icon}  ${r.config.name.padEnd(24)} ${r.status}${busy}${err}`);
      }
      console.log(`\n  Queue depth : ${snap.queueDepth ?? 'unavailable'}`);
      console.log(`  Runners     : ${snap.runners.length}\n`);
      fleet.stop();
      break;
    }

    case 'bounce': {
      const fleet = new Fleet(loadConfig(configPath));
      console.log('Running one watchdog cycle...');
      await fleet.runOnce();
      const snap = await fleet.snapshot();
      const offline = snap.runners.filter((r) => r.status === 'offline');
      if (offline.length === 0) {
        console.log('All runners healthy.');
      } else {
        console.log(`${offline.length} runner(s) still offline after bounce.`);
        for (const r of offline) {
          console.log(`  ✗  ${r.config.name}  [${r.lastErrorCode ?? 'unknown'}]`);
        }
      }
      fleet.stop();
      break;
    }

    case 'register': {
      const fleet = new Fleet(loadConfig(configPath));
      await fleet.start();
      await fleet.runOnce();
      fleet.stop();
      console.log('Registration cycle complete. Run `status` to verify.');
      break;
    }

    case 'dashboard': {
      const fleet = new Fleet(loadConfig(configPath));
      await fleet.runOnce();
      const snap = await fleet.snapshot();
      const html = renderDashboard(snap, fleet.getEventLog());
      const outPath = flagValue(args, '--out=') ?? 'fleet-dashboard.html';
      writeFileSync(outPath, html, 'utf8');
      console.log(`Dashboard written → ${outPath}`);
      fleet.stop();
      break;
    }

    case 'watch': {
      const fleet = new Fleet(loadConfig(configPath));
      fleet.onEvent((evt) => {
        const ts = new Date().toISOString();
        const runner = 'runner' in evt ? ` [${evt.runner}]` : '';
        console.log(`${ts}  ${evt.type}${runner}`);
      });
      await fleet.start();
      console.log('Watchdog running — Ctrl+C to stop.');
      process.on('SIGINT', () => {
        fleet.stop();
        process.exit(0);
      });
      break;
    }

    default:
      console.log(`
@ocr/runner-fleet — GitHub Actions self-hosted runner fleet manager

Commands:
  status      Show runner health and queue depth
  bounce      Run one watchdog cycle (restart offline runners)
  register    Re-register offline runners with a fresh token
  dashboard   Write a static HTML observability dashboard
  watch       Run the watchdog continuously

Options:
  --config=<path>   Fleet config JSON  (default: fleet.config.json)
  --out=<path>      Dashboard output   (default: fleet-dashboard.html)

Example config (fleet.config.json):
  {
    "githubToken": "ghp_...",
    "repoOwner": "yourorg",
    "repoName": "yourrepo",
    "runners": [
      {
        "name": "BLOODRAVEN-2",
        "path": "C:/Users/you/dev/actions-runner-2",
        "taskName": "GitHubActionsRunner-2"
      }
    ]
  }
`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
