# Alerts (level 8)

Rules as code that turn signals into a page or a ticket, and say what and how
much, never who.

```ts
import { createAlerter, type AlertRule } from '@ocr/signals';

export const RULES: AlertRule[] = [
  { kind: 'burn', id: 'ose.browse_burn', doc: 'Browsing events is burning its budget.',
    service: 'ose', slo: 'ose.browse_events', target: 0.995,
    routes: [{ channel: 'linear', contacts: 'ocr-oncall' }] },
  { kind: 'check', id: 'ose.health_down', doc: 'The OSE health check keeps failing.',
    service: 'ose', check: 'ose.health', severity: 'page',
    routes: [{ channel: 'email', contacts: 'ocr-oncall' }] },
];

const alerter = createAlerter({ rules: RULES, send: (route, alert) => routes[route.channel](route.contacts, alert) });
await alerter.evaluate('ose.health_down', { kind: 'check', ok: result.ok });
```

## Kinds

- **burn**: multi-window burn on an SLO (level 7). By default it pages when
  both the 60-minute and 5-minute windows burn above 14.4x, and opens a ticket
  when both the 6-hour and 30-minute windows burn above 6x. Requiring the short
  window too means it stops quickly once the problem is fixed.
- **threshold**: a metric total above or below a value for `forCount`
  evaluations in a row (default 3).
- **check**: a synthetic check (level 6) failed `failures` runs in a row
  (default 2).

## Never who

- Messages come from fixed templates and numbers. No rule field is free text
  that reaches a message.
- An alert may name a service, SLO, check, metric and client (a brand slug,
  checked with `isClientId`), never a person, path or id.
- A rule on a people metric (`people: true`) compares the **floored** value:
  1 to 4 is withheld and can never fire, and the message shows the floored
  number. Such a rule may not use `<`, which would fire on small counts.
- Routes name a **contact list id** (`ocr-oncall`, or a client's list from its
  configuration page). Addresses live in the list, never in rules.

## Behaviour

- Sends on a change of state: firing, then resolved. A firing alert repeats no
  more than every `repeatMinutes` (default 60), or at once if its severity
  changes.
- State is kept per rule and client, so one client's alert never resolves
  another's.
- Nothing throws. A route that fails is counted in `stats().send_failed`, and
  the other routes still get the alert.

Where the alerter runs (a cron Worker reading Analytics Engine and check
results) and the Linear and email senders come with the console Worker.
